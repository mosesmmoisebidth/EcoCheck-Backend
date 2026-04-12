import { ApiProperty } from '@nestjs/swagger';
import { Decision } from 'src/common/enums/decision.enum';

export class FacilityMarkerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  latitude: number;

  @ApiProperty()
  longitude: number;

  @ApiProperty()
  district: string;

  @ApiProperty()
  sector: string;

  @ApiProperty({ required: false, enum: Decision })
  lastDecision?: Decision | null;

  @ApiProperty({ required: false })
  lastInspectionDate?: number | null;
}
