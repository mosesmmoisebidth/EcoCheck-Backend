import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AuthActivateDto {
  @ApiProperty({ description: 'Email' })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ description: 'One-time activation code' })
  @IsString()
  @IsNotEmpty()
  activationCode: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @MinLength(6)
  password: string;
}
