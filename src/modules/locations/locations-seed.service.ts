import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { DistrictEntity } from './entities/district.entity';
import { SectorEntity } from './entities/sector.entity';
import { CellEntity } from './entities/cell.entity';
import { VillageEntity } from './entities/village.entity';

type DistrictSeed = {
  districtId: number;
  districtName: string;
  provinceId: number;
};

type SectorSeed = {
  sectorId: number;
  sectorName: string;
  districtId: number;
};

type CellSeed = {
  cellId: number;
  cellName: string;
  sectorId: number;
};

type VillageSeed = {
  villageId: number;
  villageName: string;
  cellId: number;
};

@Injectable()
export class LocationsSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(DistrictEntity)
    private readonly districtsRepository: Repository<DistrictEntity>,
    @InjectRepository(SectorEntity)
    private readonly sectorsRepository: Repository<SectorEntity>,
    @InjectRepository(CellEntity)
    private readonly cellsRepository: Repository<CellEntity>,
    @InjectRepository(VillageEntity)
    private readonly villagesRepository: Repository<VillageEntity>,
  ) {}

  async onModuleInit() {
    const existing = await this.districtsRepository.count();
    if (existing > 0) {
      return;
    }

    const districts = this.loadJson<DistrictSeed>('districts.json');
    const sectors = this.loadJson<SectorSeed>('sectors.json');
    const cells = this.loadJson<CellSeed>('cells.json');
    const villages = this.loadJson<VillageSeed>('villages.json');

    if (districts.length) {
      await this.districtsRepository.insert(
        districts.map((item) => ({
          districtId: item.districtId,
          districtName: item.districtName,
          provinceId: item.provinceId,
        })),
      );
    }
    if (sectors.length) {
      await this.sectorsRepository.insert(
        sectors.map((item) => ({
          sectorId: item.sectorId,
          sectorName: item.sectorName,
          districtId: item.districtId,
        })),
      );
    }
    if (cells.length) {
      await this.cellsRepository.insert(
        cells.map((item) => ({
          cellId: item.cellId,
          cellName: item.cellName,
          sectorId: item.sectorId,
        })),
      );
    }
    if (villages.length) {
      await this.villagesRepository.insert(
        villages.map((item) => ({
          villageId: item.villageId,
          villageName: item.villageName,
          cellId: item.cellId,
        })),
      );
    }
  }

  private loadJson<T>(fileName: string): T[] {
    const distPath = join(process.cwd(), 'dist', 'data', 'locations', fileName);
    const srcPath = join(process.cwd(), 'src', 'data', 'locations', fileName);
    const filePath = existsSync(distPath) ? distPath : srcPath;
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T[];
  }
}
