import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionTypeEntity } from './entities/inspection-type.entity';

type InspectionTypeSeed = {
  code: string;
  name: string;
};

const DEFAULT_TYPES: InspectionTypeSeed[] = [
  { code: 'FOOD_SAFETY', name: 'Food Safety (Restobar)' },
  { code: 'WATER_QUALITY', name: 'Water Quality' },
  { code: 'SANITATION_HYGIENE', name: 'Sanitation & Hygiene' },
  { code: 'VECTOR_CONTROL', name: 'Vector Control' },
  { code: 'SCHOOL_HEALTH', name: 'School Health' },
  { code: 'HEALTHCARE_FACILITY', name: 'Healthcare Facility' },
  { code: 'PUBLIC_BUILDING', name: 'Public Building' },
];

@Injectable()
export class InspectionTypesSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(InspectionTypeEntity)
    private readonly inspectionTypesRepository: Repository<InspectionTypeEntity>,
  ) {}

  async onModuleInit() {
    const existing = await this.inspectionTypesRepository.count();
    if (existing > 0) {
      return;
    }

    await this.inspectionTypesRepository.insert(
      DEFAULT_TYPES.map((item) => ({
        code: item.code,
        name: item.name,
        active: true,
      })),
    );
  }
}
