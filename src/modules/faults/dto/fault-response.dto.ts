import { ApiProperty } from '@nestjs/swagger';

export class FaultResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  inspectionTypeId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  standardFine: number;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ required: false, nullable: true })
  category: string | null;

  @ApiProperty()
  orderIndex: number;
}
