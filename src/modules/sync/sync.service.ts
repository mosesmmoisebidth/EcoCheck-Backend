import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SyncPushDto } from './dto/sync-push.dto';
import { SyncFacilityDto } from './dto/sync-facility.dto';
import { SyncInspectionDto } from './dto/sync-inspection.dto';
import { FacilityEntity } from '../facilities/entities/facility.entity';
import { InspectionEntity } from '../inspections/entities/inspection.entity';
import { InspectionFaultEntity } from '../inspections/entities/inspection-fault.entity';
import { FaultEntity } from '../faults/entities/fault.entity';
import { InspectionTypeEntity } from '../inspection-types/entities/inspection-type.entity';
import { UserEntity } from '../users/entities/user.entity';
import { BadRequestCustomException } from 'src/common/http/exceptions/bad-request.exception';
import { SyncStatus } from 'src/common/enums/sync-status.enum';
import { SmsService } from '../sms/sms.service';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CloudinaryService } from '../storage/cloudinary.service';
import { R2Service } from '../storage/r2.service';
import { randomUUID } from 'crypto';
import {
  KIGALI_DISTRICTS_LOWER,
  normalizeName,
} from 'src/common/constants/location.constants';

type SyncConflict = {
  clientId: string;
  serverId?: string;
  reason: string;
};

@Injectable()
export class SyncService {
  constructor(
    @InjectRepository(FacilityEntity)
    private readonly facilitiesRepository: Repository<FacilityEntity>,
    @InjectRepository(InspectionEntity)
    private readonly inspectionsRepository: Repository<InspectionEntity>,
    @InjectRepository(InspectionFaultEntity)
    private readonly inspectionFaultsRepository: Repository<InspectionFaultEntity>,
    @InjectRepository(FaultEntity)
    private readonly faultsRepository: Repository<FaultEntity>,
    @InjectRepository(InspectionTypeEntity)
    private readonly inspectionTypesRepository: Repository<InspectionTypeEntity>,
    private readonly smsService: SmsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly r2Service: R2Service,
  ) {}

  async push(dto: SyncPushDto, user: UserEntity) {
    const facilityIdMap = new Map<string, string>();
    const inspectionIdMap = new Map<string, string>();
    const facilityConflicts: SyncConflict[] = [];
    const inspectionConflicts: SyncConflict[] = [];

    for (const item of dto.facilities ?? []) {
      if (item.serverId) {
        const existing = await this.facilitiesRepository.findOne({
          where: { id: item.serverId },
          relations: ['createdBy'],
        });
        if (!existing) {
          const created = await this.createFacilityFromSync(item, user);
          facilityIdMap.set(item.clientId, created.id);
          continue;
        }
        const withinWindow =
          Date.now() - existing.createdAt.getTime() <= 24 * 60 * 60 * 1000;
        if (existing.createdBy.id !== user.id || !withinWindow) {
          facilityConflicts.push({
            clientId: item.clientId,
            serverId: existing.id,
            reason: 'Facility locked',
          });
          continue;
        }
        Object.assign(existing, {
          name: item.name.trim(),
          ownerName: item.ownerName.trim(),
          ownerPhone: item.ownerPhone.trim(),
          ownerEmail: item.ownerEmail?.trim(),
          cell: item.cell.trim(),
          village: item.village.trim(),
          latitude: item.latitude,
          longitude: item.longitude,
          photoPath: await this.resolvePhotoPath(item.photoPath),
          syncStatus: SyncStatus.SYNCED,
        });
        await this.facilitiesRepository.save(existing);
        facilityIdMap.set(item.clientId, existing.id);
      } else {
        const duplicate = await this.facilitiesRepository.findOne({
          where: { tin: item.tin },
        });
        if (duplicate) {
          facilityConflicts.push({
            clientId: item.clientId,
            serverId: duplicate.id,
            reason: 'TIN already exists',
          });
          continue;
        }
        const created = await this.createFacilityFromSync(item, user);
        facilityIdMap.set(item.clientId, created.id);
      }
    }

    for (const item of dto.inspections ?? []) {
      const facilityId = item.facilityId || facilityIdMap.get(item.facilityClientId ?? '');
      if (!facilityId) {
        inspectionConflicts.push({
          clientId: item.clientId,
          reason: 'Facility not resolved',
        });
        continue;
      }
      const facility = await this.facilitiesRepository.findOne({
        where: { id: facilityId },
      });
      if (!facility) {
        inspectionConflicts.push({
          clientId: item.clientId,
          reason: 'Facility not found',
        });
        continue;
      }

      if (item.serverId) {
        const existing = await this.inspectionsRepository.findOne({
          where: { id: item.serverId },
          relations: ['createdBy', 'facility'],
        });
        if (!existing) {
          const created = await this.createInspectionFromSync(item, facility, user);
          inspectionIdMap.set(item.clientId, created.id);
          await this.logSms(created);
          continue;
        }
        const withinWindow =
          Date.now() - existing.createdAt.getTime() <= 24 * 60 * 60 * 1000;
        if (existing.createdBy.id !== user.id || !withinWindow) {
          inspectionConflicts.push({
            clientId: item.clientId,
            serverId: existing.id,
            reason: 'Inspection locked',
          });
          continue;
        }
        await this.updateInspectionFromSync(existing, item);
        inspectionIdMap.set(item.clientId, existing.id);
        await this.logSms(existing);
      } else {
        const created = await this.createInspectionFromSync(item, facility, user);
        inspectionIdMap.set(item.clientId, created.id);
        await this.logSms(created);
      }
    }

    return {
      facilities: {
        mapped: Array.from(facilityIdMap.entries()).map(([clientId, serverId]) => ({
          clientId,
          serverId,
        })),
        conflicts: facilityConflicts,
      },
      inspections: {
        mapped: Array.from(inspectionIdMap.entries()).map(([clientId, serverId]) => ({
          clientId,
          serverId,
        })),
        conflicts: inspectionConflicts,
      },
    };
  }

  async listConflicts(user: { role: UserRole; district: string; sector: string; sub: string }) {
    const facilityQb = this.facilitiesRepository
      .createQueryBuilder('facility')
      .leftJoinAndSelect('facility.createdBy', 'createdBy')
      .where('facility.syncStatus = :status', { status: SyncStatus.CONFLICT });
    const inspectionQb = this.inspectionsRepository
      .createQueryBuilder('inspection')
      .leftJoinAndSelect('inspection.facility', 'facility')
      .leftJoinAndSelect('inspection.createdBy', 'createdBy')
      .where('inspection.syncStatus = :status', { status: SyncStatus.CONFLICT });

    if (user.role === UserRole.HSO) {
      facilityQb.andWhere('createdBy.id = :userId', { userId: user.sub });
      inspectionQb.andWhere('createdBy.id = :userId', { userId: user.sub });
    } else if (user.role === UserRole.DISTRICT_MANAGER) {
      facilityQb.andWhere('LOWER(facility.district) = :district', {
        district: normalizeName(user.district),
      });
      inspectionQb.andWhere('LOWER(facility.district) = :district', {
        district: normalizeName(user.district),
      });
    } else if (user.role === UserRole.CITY_MANAGER) {
      facilityQb.andWhere('LOWER(facility.district) IN (:...districts)', {
        districts: KIGALI_DISTRICTS_LOWER,
      });
      inspectionQb.andWhere('LOWER(facility.district) IN (:...districts)', {
        districts: KIGALI_DISTRICTS_LOWER,
      });
    }

    const facilities = await facilityQb.getMany();
    const inspections = await inspectionQb.getMany();
    return { facilities, inspections };
  }

  async pull(
    user: { role: UserRole; district: string; sector: string; sub: string },
    since?: number,
  ) {
    const facilityQb = this.facilitiesRepository
      .createQueryBuilder('facility')
      .leftJoinAndSelect('facility.createdBy', 'createdBy');
    const inspectionQb = this.inspectionsRepository
      .createQueryBuilder('inspection')
      .leftJoinAndSelect('inspection.facility', 'facility')
      .leftJoinAndSelect('inspection.createdBy', 'createdBy');

    if (user.role === UserRole.HSO) {
      facilityQb.andWhere('createdBy.id = :userId', { userId: user.sub });
      inspectionQb.andWhere('createdBy.id = :userId', { userId: user.sub });
    } else if (user.role === UserRole.DISTRICT_MANAGER) {
      facilityQb.andWhere('LOWER(facility.district) = :district', {
        district: normalizeName(user.district),
      });
      inspectionQb.andWhere('LOWER(facility.district) = :district', {
        district: normalizeName(user.district),
      });
    } else if (user.role === UserRole.CITY_MANAGER) {
      facilityQb.andWhere('LOWER(facility.district) IN (:...districts)', {
        districts: KIGALI_DISTRICTS_LOWER,
      });
      inspectionQb.andWhere('LOWER(facility.district) IN (:...districts)', {
        districts: KIGALI_DISTRICTS_LOWER,
      });
    }

    if (since) {
      const sinceDate = new Date(since);
      facilityQb.andWhere('facility.updatedAt >= :since', { since: sinceDate });
      inspectionQb.andWhere('inspection.updatedAt >= :since', { since: sinceDate });
    }

    const facilities = await facilityQb.getMany();
    const inspections = await inspectionQb.getMany();
    return { facilities, inspections };
  }

  private async createFacilityFromSync(item: SyncFacilityDto, user: UserEntity) {
    const facility = this.facilitiesRepository.create({
      name: item.name.trim(),
      tin: item.tin.trim(),
      ownerName: item.ownerName.trim(),
      ownerPhone: item.ownerPhone.trim(),
      ownerEmail: item.ownerEmail?.trim(),
      district: item.district.trim(),
      sector: item.sector.trim(),
      cell: item.cell.trim(),
      village: item.village.trim(),
      latitude: item.latitude,
      longitude: item.longitude,
      photoPath: await this.resolvePhotoPath(item.photoPath),
      createdBy: user,
      syncStatus: SyncStatus.SYNCED,
    });
    return this.facilitiesRepository.save(facility);
  }

  private async createInspectionFromSync(
    item: SyncInspectionDto,
    facility: FacilityEntity,
    user: UserEntity,
  ) {
    const faults = await this.faultsRepository.find({
      where: { id: In(item.selectedFaultIds) },
    });
    if (faults.length !== item.selectedFaultIds.length) {
      throw new BadRequestCustomException('Invalid fault selection');
    }
    const inspectionTypeId = await this.resolveInspectionTypeId(
      item.inspectionTypeId,
      faults,
    );
    const faultsTotal = faults.reduce((sum, fault) => sum + fault.standardFine, 0);
    const totalFine = faultsTotal + item.adjustmentAmount;
    const resolvedPhotos = await this.resolveInspectionPhotoPaths(item.photoPaths);
    const inspection = this.inspectionsRepository.create({
      facility,
      facilityName: facility.name,
      visitType: item.visitType,
      teamMembers: item.teamMembers,
      inspectionTypeId: inspectionTypeId ?? null,
      faultCount: faults.length,
      totalFine,
      adjustmentAmount: item.adjustmentAmount,
      adjustmentReason: item.adjustmentReason ?? '',
      decision: item.decision,
      comments: item.comments ?? '',
      recommendations: item.recommendations ?? '',
      photoPaths: resolvedPhotos,
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

  private async updateInspectionFromSync(
    inspection: InspectionEntity,
    item: SyncInspectionDto,
  ) {
    const faults = await this.faultsRepository.find({
      where: { id: In(item.selectedFaultIds) },
    });
    if (faults.length !== item.selectedFaultIds.length) {
      throw new BadRequestCustomException('Invalid fault selection');
    }
    const inspectionTypeId = await this.resolveInspectionTypeId(
      item.inspectionTypeId,
      faults,
    );
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
    const faultsTotal = faults.reduce((sum, fault) => sum + fault.standardFine, 0);
    inspection.visitType = item.visitType;
    inspection.teamMembers = item.teamMembers;
    if (inspectionTypeId) {
      inspection.inspectionTypeId = inspectionTypeId;
    }
    inspection.faultCount = faults.length;
    inspection.adjustmentAmount = item.adjustmentAmount;
    inspection.adjustmentReason = item.adjustmentReason ?? '';
    inspection.totalFine = faultsTotal + item.adjustmentAmount;
    inspection.decision = item.decision;
    inspection.comments = item.comments ?? '';
    inspection.recommendations = item.recommendations ?? '';
    if (item.photoPaths) {
      inspection.photoPaths = await this.resolveInspectionPhotoPaths(item.photoPaths);
    }
    inspection.syncStatus = SyncStatus.SYNCED;
    await this.inspectionsRepository.save(inspection);
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

  private async logSms(inspection: InspectionEntity) {
    const phone = inspection.facility?.ownerPhone ?? '';
    if (!phone) {
      return;
    }
    const message = `Inspection completed for ${inspection.facilityName}. Total fine: ${inspection.totalFine} RWF.`;
    await this.smsService.logPending(inspection, phone, message);
  }

  private async resolvePhotoPath(photoPath?: string): Promise<string | null | undefined> {
    if (!photoPath) {
      return photoPath;
    }
    const trimmed = photoPath.trim();
    if (!trimmed) {
      return trimmed;
    }
    if (trimmed.startsWith('data:image/')) {
      const uploaded = await this.cloudinaryService.uploadImage(trimmed, {
        folder: 'facilities',
      });
      return uploaded.url;
    }
    return trimmed;
  }

  private async resolveInspectionPhotoPaths(photoPaths?: string[]): Promise<string[]> {
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
}
