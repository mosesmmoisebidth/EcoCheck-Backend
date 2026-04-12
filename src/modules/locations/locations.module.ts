import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistrictEntity } from './entities/district.entity';
import { SectorEntity } from './entities/sector.entity';
import { CellEntity } from './entities/cell.entity';
import { VillageEntity } from './entities/village.entity';
import { LocationsSeedService } from './locations-seed.service';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([DistrictEntity, SectorEntity, CellEntity, VillageEntity]),
  ],
  providers: [LocationsSeedService, LocationsService],
  controllers: [LocationsController],
})
export class LocationsModule {}
