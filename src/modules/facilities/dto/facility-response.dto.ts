import { ApiProperty } from '@nestjs/swagger';
import { SyncStatus } from 'src/common/enums/sync-status.enum';
import { Decision } from 'src/common/enums/decision.enum';

export class FacilityResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  tin: string;

  @ApiProperty()
  ownerName: string;

  @ApiProperty()
  ownerPhone: string;

  @ApiProperty({ required: false })
  ownerEmail?: string | null;

  @ApiProperty()
  district: string;

  @ApiProperty()
  sector: string;

  @ApiProperty()
  cell: string;

  @ApiProperty()
  village: string;

  @ApiProperty({ required: false })
  latitude?: number | null;

  @ApiProperty({ required: false })
  longitude?: number | null;

  @ApiProperty({ required: false })
  photoPath?: string | null;

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;

  @ApiProperty()
  createdBy: string;

  @ApiProperty({ enum: SyncStatus })
  syncStatus: SyncStatus;

  @ApiProperty({ required: false })
  inspectionsCount?: number;

  @ApiProperty({ required: false })
  lastInspectionDate?: number | null;

  @ApiProperty({ required: false, enum: Decision })
  lastDecision?: Decision | null;
}
