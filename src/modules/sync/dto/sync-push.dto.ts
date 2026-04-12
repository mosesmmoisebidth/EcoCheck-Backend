import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { SyncFacilityDto } from './sync-facility.dto';
import { SyncInspectionDto } from './sync-inspection.dto';

export class SyncPushDto {
  @ApiProperty({ type: [SyncFacilityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncFacilityDto)
  facilities: SyncFacilityDto[];

  @ApiProperty({ type: [SyncInspectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncInspectionDto)
  inspections: SyncInspectionDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  lastSyncAt?: number;
}
