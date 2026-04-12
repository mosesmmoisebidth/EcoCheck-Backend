import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { FacilityEntity } from '../facilities/entities/facility.entity';
import { InspectionEntity } from '../inspections/entities/inspection.entity';
import { InspectionFaultEntity } from '../inspections/entities/inspection-fault.entity';
import { FaultEntity } from '../faults/entities/fault.entity';
import { InspectionTypeEntity } from '../inspection-types/entities/inspection-type.entity';
import { SmsModule } from '../sms/sms.module';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FacilityEntity,
      InspectionEntity,
      InspectionFaultEntity,
      FaultEntity,
      InspectionTypeEntity,
    ]),
    SmsModule,
    UsersModule,
    StorageModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
