import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Decision } from 'src/common/enums/decision.enum';
import { VisitType } from 'src/common/enums/visit-type.enum';

export class UpdateInspectionDto {
  @ApiProperty({ required: false, enum: VisitType })
  @IsOptional()
  @IsEnum(VisitType)
  visitType?: VisitType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inspectionTypeId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  teamMembers?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  selectedFaultIds?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  adjustmentAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  @ApiProperty({ required: false, enum: Decision })
  @IsOptional()
  @IsEnum(Decision)
  decision?: Decision;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  comments?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recommendations?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoPaths?: string[];
}
