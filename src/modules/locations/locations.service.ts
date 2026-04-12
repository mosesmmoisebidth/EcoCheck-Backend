import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { normalizeName } from 'src/common/constants/location.constants';
import { DistrictEntity } from './entities/district.entity';
import { SectorEntity } from './entities/sector.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(SectorEntity)
    private readonly sectorsRepository: Repository<SectorEntity>,
  ) {}

  async findSectors(district?: string): Promise<SectorEntity[]> {
    const normalizedDistrict = normalizeName(district);
    if (!normalizedDistrict) {
      return this.sectorsRepository.find({
        order: { sectorName: 'ASC' },
      });
    }

    return this.sectorsRepository
      .createQueryBuilder('sector')
      .innerJoin(
        DistrictEntity,
        'district',
        'district.districtId = sector.districtId',
      )
      .where('LOWER(district.districtName) = :district', {
        district: normalizedDistrict,
      })
      .orderBy('sector.sectorName', 'ASC')
      .getMany();
  }
}
