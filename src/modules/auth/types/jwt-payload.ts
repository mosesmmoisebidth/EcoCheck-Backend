import { UserRole } from 'src/common/enums/user-role.enum';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  district: string;
  sector: string;
};
