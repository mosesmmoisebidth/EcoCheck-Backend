import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Decision } from 'src/common/enums/decision.enum';
import { VisitType } from 'src/common/enums/visit-type.enum';

export class CreateInspectionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  facilityId: string;

  @ApiProperty({ enum: VisitType })
  @IsEnum(VisitType)
  visitType: VisitType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inspectionTypeId?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  teamMembers: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  selectedFaultIds: string[];

  @ApiProperty()
  @IsNumber()
  adjustmentAmount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  adjustmentReason?: string;

  @ApiProperty({ enum: Decision })
  @IsEnum(Decision)
  decision: Decision;

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
