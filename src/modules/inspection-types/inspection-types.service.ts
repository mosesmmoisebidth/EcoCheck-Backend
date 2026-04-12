import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionTypeEntity } from './entities/inspection-type.entity';

@Injectable()
export class InspectionTypesService {
  constructor(
    @InjectRepository(InspectionTypeEntity)
    private readonly inspectionTypesRepository: Repository<InspectionTypeEntity>,
  ) {}

  async findAll(): Promise<InspectionTypeEntity[]> {
    return this.inspectionTypesRepository.find({ order: { name: 'ASC' } });
  }
}
