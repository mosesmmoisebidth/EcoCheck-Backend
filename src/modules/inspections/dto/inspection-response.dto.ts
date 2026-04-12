import { ApiProperty } from '@nestjs/swagger';
import { Decision } from 'src/common/enums/decision.enum';
import { SyncStatus } from 'src/common/enums/sync-status.enum';
import { VisitType } from 'src/common/enums/visit-type.enum';

export class InspectionFacilityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  tin: string;

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
  ownerName?: string;

  @ApiProperty({ required: false })
  ownerPhone?: string;

  @ApiProperty({ required: false })
  ownerEmail?: string | null;
}

export class InspectionFaultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  fine: number;
}

export class InspectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  facilityId: string;

  @ApiProperty()
  facilityName: string;

  @ApiProperty({ enum: VisitType })
  visitType: VisitType;

  @ApiProperty({ type: [String] })
  teamMembers: string[];

  @ApiProperty({ required: false })
  inspectionTypeId?: string;

  @ApiProperty()
  faultCount: number;

  @ApiProperty()
  totalFine: number;

  @ApiProperty()
  adjustmentAmount: number;

  @ApiProperty()
  adjustmentReason: string;

  @ApiProperty({ enum: Decision })
  decision: Decision;

  @ApiProperty()
  comments: string;

  @ApiProperty()
  recommendations: string;

  @ApiProperty({ type: [String] })
  photoPaths: string[];

  @ApiProperty()
  createdAt: number;

  @ApiProperty()
  updatedAt: number;

  @ApiProperty()
  createdBy: string;

  @ApiProperty({ required: false })
  createdByName?: string;

  @ApiProperty({ required: false })
  createdByRole?: string;

  @ApiProperty({ required: false })
  createdByEmail?: string;

  @ApiProperty({ required: false })
  district?: string;

  @ApiProperty({ required: false })
  sector?: string;

  @ApiProperty({ required: false, type: InspectionFacilityDto })
  facility?: InspectionFacilityDto | null;

  @ApiProperty({ required: false, type: [InspectionFaultDto] })
  faults?: InspectionFaultDto[];

  @ApiProperty({ required: false })
  subtotalFine?: number;

  @ApiProperty({ enum: SyncStatus })
  syncStatus: SyncStatus;
}
