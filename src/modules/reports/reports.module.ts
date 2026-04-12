import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionEntity } from '../inspections/entities/inspection.entity';
import { FaultEntity } from '../faults/entities/fault.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([InspectionEntity, FaultEntity]), StorageModule],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
