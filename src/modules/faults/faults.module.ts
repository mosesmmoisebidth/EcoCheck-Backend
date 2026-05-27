import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaultEntity } from './entities/fault.entity';
import { InspectionTypeEntity } from '../inspection-types/entities/inspection-type.entity';
import { FaultsService } from './faults.service';
import { FaultsController } from './faults.controller';
import { FoodSafetyFaultsSeedService } from './food-safety-faults-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([FaultEntity, InspectionTypeEntity])],
  providers: [FaultsService, FoodSafetyFaultsSeedService],
  controllers: [FaultsController],
  exports: [FaultsService],
})
export class FaultsModule {}
