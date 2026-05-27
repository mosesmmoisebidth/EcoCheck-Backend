import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaultEntity } from './entities/fault.entity';
import { InspectionTypeEntity } from '../inspection-types/entities/inspection-type.entity';

type FoodSafetyQuestion = {
  orderIndex: number;
  category: string;
  name: string;
};

const FOOD_SAFETY_TYPE_CODE = 'FOOD_SAFETY';
const DEFAULT_FINE_RWF = 10000;

const FOOD_SAFETY_QUESTIONS: FoodSafetyQuestion[] = [
  // Article 21 — Premises & Infrastructure
  { orderIndex: 1, category: 'Premises & Infrastructure', name: 'Is the building not designed for residential use?' },
  { orderIndex: 2, category: 'Premises & Infrastructure', name: 'Is the restaurant located at least 1 km from the waste landfill?' },
  { orderIndex: 3, category: 'Premises & Infrastructure', name: 'Is the restaurant located far from residential houses?' },
  { orderIndex: 4, category: 'Premises & Infrastructure', name: 'Does the restaurant have a valid occupation permit?' },
  { orderIndex: 5, category: 'Premises & Infrastructure', name: 'Is the surrounding area free from dust or mud (pavers or garden)?' },
  { orderIndex: 6, category: 'Premises & Infrastructure', name: 'Does the restaurant have water storage and rain water harvesting?' },
  { orderIndex: 7, category: 'Premises & Infrastructure', name: 'Does the restaurant have a waste water treatment system?' },
  { orderIndex: 8, category: 'Premises & Infrastructure', name: 'Is the restaurant painted cream?' },
  { orderIndex: 9, category: 'Premises & Infrastructure', name: 'Is the building constructed with durable materials and finishing?' },
  { orderIndex: 10, category: 'Premises & Infrastructure', name: 'Does the restaurant have good ventilation?' },
  { orderIndex: 11, category: 'Premises & Infrastructure', name: 'Is the kitchen floor tiled and walls tiled to 1.5m height?' },
  { orderIndex: 12, category: 'Premises & Infrastructure', name: 'Is there a fume and heat extraction system in the kitchen?' },
  { orderIndex: 13, category: 'Premises & Infrastructure', name: 'Is there a dish-washing area with a water heater and running water?' },
  { orderIndex: 14, category: 'Premises & Infrastructure', name: 'Does the store have adequate lighting, ventilation, shelves and pallets?' },
  { orderIndex: 15, category: 'Premises & Infrastructure', name: 'Is there a designated dining area?' },
  { orderIndex: 16, category: 'Premises & Infrastructure', name: 'Are there separate male and female lavatories for clients and staff?' },
  { orderIndex: 17, category: 'Premises & Infrastructure', name: 'Is there a changing room for staff?' },
  { orderIndex: 18, category: 'Premises & Infrastructure', name: 'Is there a fire prevention and fighting system?' },
  { orderIndex: 19, category: 'Premises & Infrastructure', name: 'Is there a hand-washing facility before the kitchen entrance?' },

  // Article 22 — Staff Hygiene & Qualifications
  { orderIndex: 20, category: 'Staff Hygiene & Qualifications', name: 'Do staff maintain body hygiene and show no signs of communicable disease?' },
  { orderIndex: 21, category: 'Staff Hygiene & Qualifications', name: 'Do staff have current medical certificates (check-up every 4 months)?' },
  { orderIndex: 22, category: 'Staff Hygiene & Qualifications', name: 'Do kitchen staff wear white apron, white hat, and white shoes?' },
  { orderIndex: 23, category: 'Staff Hygiene & Qualifications', name: 'Are staff always clean (nails cut, no nail polish, no rings)?' },
  { orderIndex: 24, category: 'Staff Hygiene & Qualifications', name: 'Do all staff wear clean uniform?' },
  { orderIndex: 25, category: 'Staff Hygiene & Qualifications', name: 'Is there a hand-washing facility available for staff use?' },
  { orderIndex: 26, category: 'Staff Hygiene & Qualifications', name: 'Is at least one staff member qualified for the job?' },

  // Article 23 — Equipment & Utensils
  { orderIndex: 27, category: 'Equipment & Utensils', name: 'Is there an aluminium kitchen table?' },
  { orderIndex: 28, category: 'Equipment & Utensils', name: 'Is there a pedal dustbin?' },
  { orderIndex: 29, category: 'Equipment & Utensils', name: 'Is there a glass-door cabinet for cutlery?' },
  { orderIndex: 30, category: 'Equipment & Utensils', name: 'Is there a hand-washing facility with hot and cold water?' },
  { orderIndex: 31, category: 'Equipment & Utensils', name: 'Is there a liquid soap dispenser?' },
  { orderIndex: 32, category: 'Equipment & Utensils', name: 'Is there a hand dryer?' },
  { orderIndex: 33, category: 'Equipment & Utensils', name: 'Is there a water heater for the shower?' },
  { orderIndex: 34, category: 'Equipment & Utensils', name: 'Are there sufficient refrigerators separating animal, water, and plant products?' },
  { orderIndex: 35, category: 'Equipment & Utensils', name: 'Is there fire fighting equipment present?' },
  { orderIndex: 36, category: 'Equipment & Utensils', name: 'Are table napkins not cut into pieces?' },
  { orderIndex: 37, category: 'Equipment & Utensils', name: 'Is table cutlery at least 3x the number of clients?' },

  // Article 24 — Waste Management
  { orderIndex: 38, category: 'Waste Management', name: 'Does the restaurant have a contract with a waste transportation operator?' },

  // Article 25 — Authorisation
  { orderIndex: 39, category: 'Authorisation', name: 'Does the restaurant have authorisation from the District/Sector authority?' },
];

@Injectable()
export class FoodSafetyFaultsSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(FaultEntity)
    private readonly faultsRepository: Repository<FaultEntity>,
    @InjectRepository(InspectionTypeEntity)
    private readonly inspectionTypesRepository: Repository<InspectionTypeEntity>,
  ) {}

  async onModuleInit() {
    const type = await this.inspectionTypesRepository.findOne({
      where: { code: FOOD_SAFETY_TYPE_CODE },
    });
    if (!type) {
      return;
    }
    const existing = await this.faultsRepository
      .createQueryBuilder('fault')
      .leftJoin('fault.inspectionType', 'inspectionType')
      .where('inspectionType.id = :id', { id: type.id })
      .getMany();
    const existingByName = new Map<string, (typeof existing)[number]>();
    for (const fault of existing) {
      existingByName.set(this.normalizeKey(fault.name), fault);
    }

    const toSave: typeof existing = [];
    for (const question of FOOD_SAFETY_QUESTIONS) {
      const key = this.normalizeKey(question.name);
      const match = existingByName.get(key);
      if (match) {
        const needsUpdate =
          match.category !== question.category ||
          match.orderIndex !== question.orderIndex;
        if (needsUpdate) {
          match.category = question.category;
          match.orderIndex = question.orderIndex;
          toSave.push(match);
        }
      } else {
        toSave.push(
          this.faultsRepository.create({
            inspectionType: type,
            name: question.name,
            category: question.category,
            orderIndex: question.orderIndex,
            standardFine: DEFAULT_FINE_RWF,
            active: true,
          }),
        );
      }
    }

    if (toSave.length > 0) {
      await this.faultsRepository.save(toSave);
    }
  }

  private normalizeKey(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
