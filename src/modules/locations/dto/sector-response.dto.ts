import { ApiProperty } from '@nestjs/swagger';

export class SectorResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  districtId: number;
}
