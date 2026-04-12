import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthDeleteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}
