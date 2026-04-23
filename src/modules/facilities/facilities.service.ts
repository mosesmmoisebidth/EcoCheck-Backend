import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BadRequestCustomException } from 'src/common/http/exceptions/bad-request.exception';
import { NotFoundCustomException } from 'src/common/http/exceptions/not-found.exception';
import { ForbiddenCustomException } from 'src/common/http/exceptions/forbidden.exception';
import { UserRole } from 'src/common/enums/user-role.enum';
import { Decision } from 'src/common/enums/decision.enum';
import {
  KIGALI_DISTRICTS_LOWER,
  normalizeName,
} from 'src/common/constants/location.constants';
import { SyncStatus } from 'src/common/enums/sync-status.enum';
import { FacilityEntity } from './entities/facility.entity';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { UserEntity } from '../users/entities/user.entity';
import { CloudinaryService } from '../storage/cloudinary.service';
import { InspectionEntity } from '../inspections/entities/inspection.entity';

@Injectable()
export class FacilitiesService {
  constructor(
    @InjectRepository(FacilityEntity)
    private readonly facilitiesRepository: Repository<FacilityEntity>,
    @InjectRepository(InspectionEntity)
    private readonly inspectionsRepository: Repository<InspectionEntity>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateFacilityDto, user: UserEntity): Promise<FacilityEntity> {
    const existing = await this.facilitiesRepository.findOne({
      where: { tin: dto.tin },
    });
    if (existing) {
      throw new BadRequestCustomException('TIN already exists');
    }
    const facility = this.facilitiesRepository.create({
      name: dto.name.trim(),
      tin: dto.tin.trim(),
      ownerName: dto.ownerName.trim(),
      ownerPhone: dto.ownerPhone.trim(),
      ownerEmail: dto.ownerEmail?.trim(),
      district: dto.district.trim(),
      sector: dto.sector.trim(),
      cell: dto.cell.trim(),
      village: dto.village.trim(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      photoPath: await this.resolvePhotoPath(dto.photoPath),
      createdBy: user,
      syncStatus: SyncStatus.SYNCED,
    });
    return this.facilitiesRepository.save(facility);
  }

  async findAll(
    user: { role: UserRole; district: string; sector: string; sub: string },
    search?: string,
    district?: string,
    sector?: string,
  ): Promise<FacilityEntity[]> {
    const qb = this.facilitiesRepository.createQueryBuilder('facility');
    qb.leftJoinAndSelect('facility.createdBy', 'createdBy');
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
    if (search) {
      qb.andWhere(
        '(facility.name ILIKE :search OR facility.tin ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (district) {
      qb.andWhere('LOWER(facility.district) = :filterDistrict', {
        filterDistrict: normalizeName(district),
      });
    }
    if (sector) {
      qb.andWhere('LOWER(facility.sector) = :filterSector', {
        filterSector: normalizeName(sector),
      });
    }
    qb.orderBy('facility.createdAt', 'DESC');
    return qb.getMany();
  }

  async findMarkers(
    user: { role: UserRole; district: string; sector: string; sub: string },
    district?: string,
    sector?: string,
  ): Promise<FacilityEntity[]> {
    const qb = this.facilitiesRepository.createQueryBuilder('facility');
    qb.leftJoin('facility.createdBy', 'createdBy');
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
    if (district) {
      qb.andWhere('LOWER(facility.district) = :filterDistrict', {
        filterDistrict: normalizeName(district),
      });
    }
    if (sector) {
      qb.andWhere('LOWER(facility.sector) = :filterSector', {
        filterSector: normalizeName(sector),
      });
    }
    qb.andWhere('facility.latitude IS NOT NULL');
    qb.andWhere('facility.longitude IS NOT NULL');
    qb.select([
      'facility.id',
      'facility.name',
      'facility.latitude',
      'facility.longitude',
      'facility.district',
      'facility.sector',
    ]);
    return qb.getMany();
  }

  async getInspectionStats(
    facilityIds: string[],
  ): Promise<Map<string, FacilityInspectionStats>> {
    const stats = new Map<string, FacilityInspectionStats>();
    if (!facilityIds.length) {
      return stats;
    }
    const inspections = await this.inspectionsRepository.find({
      where: { facility: { id: In(facilityIds) } },
      order: { createdAt: 'DESC' },
    });
    inspections.forEach((inspection) => {
      const facilityId = inspection.facility?.id ?? '';
      if (!facilityId) return;
      const existing = stats.get(facilityId);
      if (!existing) {
        stats.set(facilityId, {
          inspectionsCount: 1,
          lastDecision: inspection.decision,
          lastInspectionDate: inspection.createdAt,
        });
      } else {
        existing.inspectionsCount += 1;
      }
    });
    return stats;
  }

  async findOne(id: string): Promise<FacilityEntity> {
    const facility = await this.facilitiesRepository.findOne({
      where: { id },
    });
    if (!facility) {
      throw new NotFoundCustomException('Facility not found');
    }
    return facility;
  }

  async findOneForUser(
    id: string,
    user: { role: UserRole; district: string; sector: string; sub: string },
  ): Promise<FacilityEntity> {
    const qb = this.facilitiesRepository
      .createQueryBuilder('facility')
      .leftJoinAndSelect('facility.createdBy', 'createdBy')
      .where('facility.id = :id', { id });

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

    const facility = await qb.getOne();
    if (!facility) {
      throw new NotFoundCustomException('Facility not found');
    }
    return facility;
  }

  async update(
    id: string,
    dto: UpdateFacilityDto,
    user: UserEntity,
  ): Promise<FacilityEntity> {
    const facility = await this.findOne(id);
    const withinWindow =
      Date.now() - facility.createdAt.getTime() <= 24 * 60 * 60 * 1000;
    if (facility.createdBy.id !== user.id || !withinWindow) {
      throw new ForbiddenCustomException('Facility is locked');
    }
    Object.assign(facility, {
      name: dto.name ?? facility.name,
      ownerName: dto.ownerName ?? facility.ownerName,
      ownerPhone: dto.ownerPhone ?? facility.ownerPhone,
      ownerEmail: dto.ownerEmail ?? facility.ownerEmail,
      cell: dto.cell ?? facility.cell,
      village: dto.village ?? facility.village,
      latitude: dto.latitude ?? facility.latitude,
      longitude: dto.longitude ?? facility.longitude,
      photoPath: dto.photoPath
        ? await this.resolvePhotoPath(dto.photoPath)
        : facility.photoPath,
    });
    return this.facilitiesRepository.save(facility);
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
}

export type FacilityInspectionStats = {
  inspectionsCount: number;
  lastDecision?: Decision;
  lastInspectionDate?: Date;
};
