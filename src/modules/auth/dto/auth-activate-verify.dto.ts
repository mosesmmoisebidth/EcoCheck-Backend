import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AuthActivateVerifyDto {
  @ApiProperty({ description: 'Email' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'One-time activation code' })
  @IsString()
  @IsNotEmpty()
  activationCode: string;
}
