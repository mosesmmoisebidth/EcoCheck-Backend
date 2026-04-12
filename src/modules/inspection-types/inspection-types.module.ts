import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionTypeEntity } from './entities/inspection-type.entity';
import { InspectionTypesService } from './inspection-types.service';
import { InspectionTypesController } from './inspection-types.controller';
import { InspectionTypesSeedService } from './inspection-types-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([InspectionTypeEntity])],
  providers: [InspectionTypesService, InspectionTypesSeedService],
  controllers: [InspectionTypesController],
  exports: [InspectionTypesService],
})
export class InspectionTypesModule {}
