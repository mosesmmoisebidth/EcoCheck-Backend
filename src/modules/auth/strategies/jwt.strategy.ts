import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '../types/jwt-payload';
import { readEnvValue } from 'src/utils/env.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:
        readEnvValue(configService.get<string>('JWT_ACCESS_TOKEN_SECRET_KEY')) ??
        'change_me',
    });
  }

  async validate(payload: JwtPayload) {
    return payload;
  }
}
