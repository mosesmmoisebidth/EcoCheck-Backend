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
}
