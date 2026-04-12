import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class SyncFacilityDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  serverId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tin: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ownerPhone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ownerEmail?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  sector: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  cell: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  village: string;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  createdAt?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  updatedAt?: number;
}
