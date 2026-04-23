import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BadRequestCustomException } from 'src/common/http/exceptions/bad-request.exception';
import { NotFoundCustomException } from 'src/common/http/exceptions/not-found.exception';
import { ForbiddenCustomException } from 'src/common/http/exceptions/forbidden.exception';
import { UserRole } from 'src/common/enums/user-role.enum';
import { SyncStatus } from 'src/common/enums/sync-status.enum';
import { Decision } from 'src/common/enums/decision.enum';
import { VisitType } from 'src/common/enums/visit-type.enum';
import {
  KIGALI_DISTRICTS_LOWER,
  normalizeName,
} from 'src/common/constants/location.constants';
import { InspectionEntity } from './entities/inspection.entity';
import { InspectionFaultEntity } from './entities/inspection-fault.entity';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { FacilityEntity } from '../facilities/entities/facility.entity';
import { FaultEntity } from '../faults/entities/fault.entity';
import { InspectionTypeEntity } from '../inspection-types/entities/inspection-type.entity';
import { UserEntity } from '../users/entities/user.entity';
import { R2Service } from '../storage/r2.service';
import { randomUUID } from 'crypto';

@Injectable()
export class InspectionsService {
  constructor(
    @InjectRepository(InspectionEntity)
    private readonly inspectionsRepository: Repository<InspectionEntity>,
    @InjectRepository(InspectionFaultEntity)
    private readonly inspectionFaultsRepository: Repository<InspectionFaultEntity>,
    @InjectRepository(FacilityEntity)
    private readonly facilitiesRepository: Repository<FacilityEntity>,
    @InjectRepository(FaultEntity)
    private readonly faultsRepository: Repository<FaultEntity>,
    @InjectRepository(InspectionTypeEntity)
    private readonly inspectionTypesRepository: Repository<InspectionTypeEntity>,
    private readonly r2Service: R2Service,
  ) {}

  async create(dto: CreateInspectionDto, user: UserEntity): Promise<InspectionEntity> {
    const facility = await this.facilitiesRepository.findOne({
      where: { id: dto.facilityId },
    });
    if (!facility) {
      throw new NotFoundCustomException('Facility not found');
    }
    const faults = await this.faultsRepository.find({
      where: { id: In(dto.selectedFaultIds) },
    });
    if (faults.length !== dto.selectedFaultIds.length) {
      throw new BadRequestCustomException('Invalid fault selection');
    }
    const inspectionTypeId = await this.resolveInspectionTypeId(
      dto.inspectionTypeId,
      faults,
    );
    const faultsTotal = faults.reduce((sum, fault) => sum + fault.standardFine, 0);
    const totalFine = faultsTotal + dto.adjustmentAmount;

    const inspection = this.inspectionsRepository.create({
      facility,
      facilityName: facility.name,
      visitType: dto.visitType,
      teamMembers: dto.teamMembers,
      inspectionTypeId: inspectionTypeId ?? null,
      faultCount: faults.length,
      totalFine,
      adjustmentAmount: dto.adjustmentAmount,
      adjustmentReason: dto.adjustmentReason ?? '',
      decision: dto.decision,
      comments: dto.comments ?? '',
      recommendations: dto.recommendations ?? '',
      photoPaths: await this.resolvePhotoPaths(dto.photoPaths),
      createdBy: user,
      syncStatus: SyncStatus.SYNCED,
    });
    const saved = await this.inspectionsRepository.save(inspection);
    const faultEntities = faults.map((fault) =>
      this.inspectionFaultsRepository.create({
        inspection: saved,
        fault,
        faultName: fault.name,
        fineAmount: fault.standardFine,
      }),
    );
    await this.inspectionFaultsRepository.save(faultEntities);
    return saved;
  }

  async findAll(
    user: { role: UserRole; district: string; sector: string; sub: string },
    filters: InspectionQueryFilters = {},
  ): Promise<InspectionEntity[]> {
    const qb = this.inspectionsRepository
      .createQueryBuilder('inspection')
      .leftJoinAndSelect('inspection.facility', 'facility')
      .leftJoinAndSelect('inspection.createdBy', 'createdBy');
    if (user.role === UserRole.HSO) {
      qb.andWhere('createdBy.id = :userId', { userId: user.sub });
    } else if (user.role === UserRole.DISTRICT_MANAGER) {
      qb.andWhere('LOWER(facility.district) = :district', {
        district: normalizeName(user.district),
      });
    } else if (user.role === UserRole.CITY_MANAGER) {
      qb.andWhere('LOWER(facility.district) IN (:...districts)', {
        districts: KIGALI_DISTRICTS_LOWER,
      });
    }
    if (filters.facilityId) {
      qb.andWhere('facility.id = :facilityId', { facilityId: filters.facilityId });
    }
    if (filters.district) {
      qb.andWhere('LOWER(facility.district) = :filterDistrict', {
        filterDistrict: normalizeName(filters.district),
      });
    }
    if (filters.sector) {
      qb.andWhere('LOWER(facility.sector) = :filterSector', {
        filterSector: normalizeName(filters.sector),
      });
    }
    if (filters.officerId) {
      qb.andWhere('createdBy.id = :officerId', { officerId: filters.officerId });
    }
    const visitType = this.resolveVisitType(filters.visitType);
    if (visitType) {
      qb.andWhere('inspection.visitType = :visitType', { visitType });
    }
    const decision = this.resolveDecision(filters.decision);
    if (decision) {
      qb.andWhere('inspection.decision = :decision', { decision });
    }
    const range = this.resolveDateRange(filters.startDate, filters.endDate);
    if (range.start) {
      qb.andWhere('inspection.createdAt >= :startDate', { startDate: range.start });
    }
    if (range.end) {
      qb.andWhere('inspection.createdAt <= :endDate', { endDate: range.end });
    }
    qb.orderBy('inspection.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string): Promise<InspectionEntity> {
    const inspection = await this.inspectionsRepository.findOne({
      where: { id },
      relations: ['facility', 'createdBy', 'faults'],
    });
    if (!inspection) {
      throw new NotFoundCustomException('Inspection not found');
    }
    return inspection;
  }

  async findOneForUser(
    id: string,
    user: { role: UserRole; district: string; sector: string; sub: string },
  ): Promise<InspectionEntity> {
    const qb = this.inspectionsRepository
      .createQueryBuilder('inspection')
      .leftJoinAndSelect('inspection.facility', 'facility')
      .leftJoinAndSelect('inspection.createdBy', 'createdBy')
      .leftJoinAndSelect('inspection.faults', 'faults')
      .where('inspection.id = :id', { id });

    if (user.role === UserRole.HSO) {
      qb.andWhere('createdBy.id = :userId', { userId: user.sub });
    } else if (user.role === UserRole.DISTRICT_MANAGER) {
      qb.andWhere('LOWER(facility.district) = :district', {
        district: normalizeName(user.district),
      });
    } else if (user.role === UserRole.CITY_MANAGER) {
      qb.andWhere('LOWER(facility.district) IN (:...districts)', {
        districts: KIGALI_DISTRICTS_LOWER,
      });
    }

    const inspection = await qb.getOne();
    if (!inspection) {
      throw new NotFoundCustomException('Inspection not found');
    }
    return inspection;
  }

  async update(
    id: string,
    dto: UpdateInspectionDto,
    user: UserEntity,
  ): Promise<InspectionEntity> {
    const inspection = await this.findOne(id);
    const withinWindow =
      Date.now() - inspection.createdAt.getTime() <= 24 * 60 * 60 * 1000;
    if (inspection.createdBy.id !== user.id || !withinWindow) {
      throw new ForbiddenCustomException('Inspection is locked');
    }

    let faultIds = dto.selectedFaultIds;
    let resolvedTypeId = dto.inspectionTypeId;
    if (faultIds && faultIds.length > 0) {
      const faults = await this.faultsRepository.find({
        where: { id: In(faultIds) },
      });
      if (faults.length !== faultIds.length) {
        throw new BadRequestCustomException('Invalid fault selection');
      }
      resolvedTypeId = await this.resolveInspectionTypeId(resolvedTypeId, faults);
      await this.inspectionFaultsRepository.delete({
        inspection: { id: inspection.id },
      });
      const faultEntities = faults.map((fault) =>
        this.inspectionFaultsRepository.create({
          inspection,
          fault,
          faultName: fault.name,
          fineAmount: fault.standardFine,
        }),
      );
      await this.inspectionFaultsRepository.save(faultEntities);
      inspection.faultCount = faults.length;
      const faultsTotal = faults.reduce((sum, fault) => sum + fault.standardFine, 0);
      const adjustment = dto.adjustmentAmount ?? inspection.adjustmentAmount;
      inspection.totalFine = faultsTotal + adjustment;
    } else if (resolvedTypeId) {
      resolvedTypeId = await this.resolveInspectionTypeId(
        resolvedTypeId,
        inspection.faults?.map((item) => item.fault).filter(Boolean) ?? [],
      );
    }

    inspection.visitType = dto.visitType ?? inspection.visitType;
    inspection.teamMembers = dto.teamMembers ?? inspection.teamMembers;
    if (resolvedTypeId) {
      inspection.inspectionTypeId = resolvedTypeId;
    }
    inspection.adjustmentAmount =
      dto.adjustmentAmount ?? inspection.adjustmentAmount;
    inspection.adjustmentReason =
      dto.adjustmentReason ?? inspection.adjustmentReason;
    inspection.decision = dto.decision ?? inspection.decision;
    inspection.comments = dto.comments ?? inspection.comments;
    inspection.recommendations = dto.recommendations ?? inspection.recommendations;
    if (dto.photoPaths) {
      inspection.photoPaths = await this.resolvePhotoPaths(dto.photoPaths);
    }

    return this.inspectionsRepository.save(inspection);
  }

  private async resolvePhotoPaths(photoPaths?: string[]): Promise<string[]> {
    if (!photoPaths || photoPaths.length === 0) {
      return [];
    }
    const resolved: string[] = [];
    for (const raw of photoPaths) {
      const trimmed = raw?.trim();
      if (!trimmed) {
        continue;
      }
      if (trimmed.startsWith('data:image/')) {
        const parsed = this.parseDataUrl(trimmed);
        if (!parsed) {
          continue;
        }
        const key = `inspections/${randomUUID()}.${parsed.extension}`;
        const url = await this.r2Service.uploadImage(
          key,
          parsed.buffer,
          parsed.contentType,
        );
        resolved.push(url);
      } else {
        resolved.push(trimmed);
      }
    }
    return resolved;
  }

  private parseDataUrl(
    dataUrl: string,
  ): { buffer: Buffer; contentType: string; extension: string } | null {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
    if (!match) {
      return null;
    }
    const contentType = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, 'base64');
    const extension = contentType.split('/')[1] || 'jpg';
    return {
      buffer,
      contentType,
      extension: extension === 'jpeg' ? 'jpg' : extension,
    };
  }

  private async resolveInspectionTypeId(
    requestedTypeId: string | undefined,
    faults: FaultEntity[],
  ): Promise<string | undefined> {
    const typeIds = Array.from(
      new Set(
        faults
          .map((fault) => fault.inspectionType?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (requestedTypeId) {
      const trimmed = requestedTypeId.trim();
      let type: InspectionTypeEntity | null = null;
      if (this.isUuid(trimmed)) {
        type = await this.inspectionTypesRepository.findOne({
          where: { id: trimmed },
        });
      }
      if (!type) {
        const normalized = this.normalizeInspectionTypeCode(trimmed);
        type = await this.inspectionTypesRepository.findOne({
          where: { code: normalized },
        });
      }
      if (!type) {
        throw new BadRequestCustomException('Invalid inspection type');
      }
      if (typeIds.length > 0 && (typeIds.length > 1 || typeIds[0] !== type.id)) {
        throw new BadRequestCustomException('Faults do not match inspection type');
      }
      return type.id;
    }

    if (typeIds.length > 1) {
      throw new BadRequestCustomException('Faults belong to multiple inspection types');
    }
    return typeIds[0];
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private normalizeInspectionTypeCode(value: string): string {
    return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
  }

  private resolveDecision(value?: string): Decision | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const map: Record<string, Decision> = {
      WARNING: Decision.WARNING,
      CLOSURE_IMMEDIATE: Decision.CLOSURE_IMMEDIATE,
      CLOSURE_DEADLINE: Decision.CLOSURE_DEADLINE,
      PROSECUTION_RECOMMENDED: Decision.PROSECUTION_RECOMMENDED,
      PROSECUTION: Decision.PROSECUTION_RECOMMENDED,
      NO_ACTION: Decision.NO_ACTION,
      COMPLIANT: Decision.NO_ACTION,
    };
    return map[normalized];
  }

  private resolveVisitType(value?: string): VisitType | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const map: Record<string, VisitType> = {
      FIRST_VISIT: VisitType.FIRST,
      FIRST: VisitType.FIRST,
      WARNING: VisitType.WARNING,
      FOLLOW_UP: VisitType.FOLLOW_UP,
      COMPLIANCE: VisitType.COMPLIANCE,
    };
    return map[normalized];
  }

  private resolveDateRange(startDate?: string, endDate?: string) {
    const range: { start?: Date; end?: Date } = {};
    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        range.start = start;
      }
    }
    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        range.end = end;
      }
    }
    return range;
  }
}

export type InspectionQueryFilters = {
  facilityId?: string;
  district?: string;
  sector?: string;
  officerId?: string;
  visitType?: string;
  decision?: string;
  startDate?: string;
  endDate?: string;
};
