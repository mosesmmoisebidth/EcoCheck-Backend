import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { InspectionEntity } from '../inspections/entities/inspection.entity';
import { InspectionFaultEntity } from '../inspections/entities/inspection-fault.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InspectionEntity, InspectionFaultEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
