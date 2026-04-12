import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class UpdateFacilityDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cell?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  village?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photoPath?: string;
}
