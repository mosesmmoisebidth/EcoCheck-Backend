import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundCustomException } from 'src/common/http/exceptions/not-found.exception';
import { BadRequestCustomException } from 'src/common/http/exceptions/bad-request.exception';
import { normalizeName } from 'src/common/constants/location.constants';
import { FaultEntity } from './entities/fault.entity';
import { UpdateFaultDto } from './dto/update-fault.dto';
import { CreateFaultsBulkDto } from './dto/create-faults-bulk.dto';
import { InspectionTypeEntity } from '../inspection-types/entities/inspection-type.entity';

@Injectable()
export class FaultsService {
  constructor(
    @InjectRepository(FaultEntity)
    private readonly faultsRepository: Repository<FaultEntity>,
    @InjectRepository(InspectionTypeEntity)
    private readonly inspectionTypesRepository: Repository<InspectionTypeEntity>,
  ) {}

  async findAll(
    inspectionTypeId?: string,
    active?: boolean,
  ): Promise<FaultEntity[]> {
    const qb = this.faultsRepository
      .createQueryBuilder('fault')
      .leftJoinAndSelect('fault.inspectionType', 'inspectionType');
    if (inspectionTypeId) {
      qb.andWhere('inspectionType.id = :inspectionTypeId', { inspectionTypeId });
    }
    if (active !== undefined) {
      qb.andWhere('fault.active = :active', { active });
    }
    qb.orderBy('fault.name', 'ASC');
    return qb.getMany();
  }

  async update(id: string, dto: UpdateFaultDto): Promise<FaultEntity> {
    const fault = await this.faultsRepository.findOne({ where: { id } });
    if (!fault) {
      throw new NotFoundCustomException('Fault not found');
    }
    if (dto.standardFine !== undefined) {
      fault.standardFine = dto.standardFine;
    }
    if (dto.name !== undefined) {
      const trimmed = dto.name.trim().replace(/\s+/g, ' ');
      if (!trimmed) {
        throw new BadRequestCustomException('Fault name cannot be empty');
      }
      fault.name = trimmed;
    }
    if (dto.active !== undefined) {
      fault.active = dto.active;
    }
    return this.faultsRepository.save(fault);
  }

  async createBulk(dto: CreateFaultsBulkDto): Promise<{
    created: FaultEntity[];
    skipped: string[];
    total: number;
  }> {
    const type = await this.inspectionTypesRepository.findOne({
      where: { id: dto.inspectionTypeId },
    });
    if (!type) {
      throw new NotFoundCustomException('Inspection type not found');
    }

    const standardFine =
      dto.standardFine !== undefined ? dto.standardFine : 10000;

    const existing = await this.faultsRepository
      .createQueryBuilder('fault')
      .leftJoinAndSelect('fault.inspectionType', 'inspectionType')
      .where('inspectionType.id = :inspectionTypeId', {
        inspectionTypeId: dto.inspectionTypeId,
      })
      .getMany();

    const existingNames = new Set(
      existing.map((fault) => normalizeName(fault.name)),
    );

    const seen = new Set<string>();
    const skipped: string[] = [];
    const toCreate: FaultEntity[] = [];

    dto.questions.forEach((raw) => {
      const trimmed = raw?.trim().replace(/\s+/g, ' ');
      if (!trimmed) {
        return;
      }
      const normalized = normalizeName(trimmed);
      if (seen.has(normalized) || existingNames.has(normalized)) {
        skipped.push(trimmed);
        return;
      }
      seen.add(normalized);
      toCreate.push(
        this.faultsRepository.create({
          inspectionType: type,
          name: trimmed,
          standardFine,
          active: true,
        }),
      );
    });

    if (toCreate.length === 0) {
      throw new BadRequestCustomException('No new questions to upload');
    }

    const created = await this.faultsRepository.save(toCreate);
    return { created, skipped, total: dto.questions.length };
  }
}
