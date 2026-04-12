import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionEntity } from './entities/inspection.entity';
import { InspectionFaultEntity } from './entities/inspection-fault.entity';
import { InspectionsService } from './inspections.service';
import { InspectionsController } from './inspections.controller';
import { FacilityEntity } from '../facilities/entities/facility.entity';
import { FaultEntity } from '../faults/entities/fault.entity';
import { InspectionTypeEntity } from '../inspection-types/entities/inspection-type.entity';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InspectionEntity,
      InspectionFaultEntity,
      FacilityEntity,
      FaultEntity,
      InspectionTypeEntity,
    ]),
    UsersModule,
    StorageModule,
  ],
  providers: [InspectionsService],
  controllers: [InspectionsController],
  exports: [InspectionsService],
})
export class InspectionsModule {}
