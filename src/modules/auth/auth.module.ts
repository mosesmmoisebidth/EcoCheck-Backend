import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { parseDurationToSeconds, readEnvValue } from 'src/utils/env.util';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          readEnvValue(configService.get<string>('JWT_ACCESS_TOKEN_SECRET_KEY')) ??
          'change_me';
        const rawExpires =
          readEnvValue(configService.get<string>('ACCESS_TOKEN_EXPIRE')) ?? '3600';
        const expiresIn = parseDurationToSeconds(rawExpires, 60 * 60);
        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
