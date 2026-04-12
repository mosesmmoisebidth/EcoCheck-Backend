import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFaultsBulkDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  inspectionTypeId: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  questions: string[];

  @ApiProperty({ required: false, default: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  standardFine?: number;
}
