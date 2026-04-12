import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/common/enums/user-role.enum';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty()
  district: string;

  @ApiProperty()
  sector: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  activationStatus?: 'active' | 'pending' | 'disabled';

  @ApiProperty({ required: false })
  activationCode?: string;

  @ApiProperty({ required: false })
  activationExpiresAt?: number;
}
