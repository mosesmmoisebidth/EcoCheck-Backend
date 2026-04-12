import { ApiProperty } from '@nestjs/swagger';

export class InspectionTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  active: boolean;
}
