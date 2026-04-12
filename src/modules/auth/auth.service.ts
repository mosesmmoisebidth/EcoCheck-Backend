import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';
import { UnauthorizedCustomException } from 'src/common/http/exceptions/unauthorized.exception';
import { BadRequestCustomException } from 'src/common/http/exceptions/bad-request.exception';
import { NotFoundCustomException } from 'src/common/http/exceptions/not-found.exception';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { AuthLoginDto } from './dto/auth-login.dto';
import { AuthRefreshDto } from './dto/auth-refresh.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { AuthUpdateProfileDto } from './dto/auth-update-profile.dto';
import { AuthActivateDto } from './dto/auth-activate.dto';
import { AuthActivateVerifyDto } from './dto/auth-activate-verify.dto';
import { AuthChangePasswordDto } from './dto/auth-change-password.dto';
import { AuthChangeEmailDto } from './dto/auth-change-email.dto';
import { AuthDeleteDto } from './dto/auth-delete.dto';
import type { JwtPayload } from './types/jwt-payload';
import { createHash } from 'crypto';
import { parseDurationToSeconds, readEnvValue } from 'src/utils/env.util';
import { UserRole } from 'src/common/enums/user-role.enum';

@Injectable()
export class AuthService {
  private readonly accessTokenTtl: number;
  private readonly refreshTokenTtl: number;
  private readonly refreshSecret: string;

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshRepository: Repository<RefreshTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenTtl = parseDurationToSeconds(
      configService.get<string>('ACCESS_TOKEN_EXPIRE'),
      60 * 60,
    );
    this.refreshTokenTtl = parseDurationToSeconds(
      configService.get<string>('REFRESH_TOKEN_EXPIRE'),
      60 * 60 * 24 * 30,
    );
    this.refreshSecret =
      readEnvValue(configService.get<string>('JWT_REFRESH_TOKEN_SECRET_KEY')) ??
      'change_me_refresh';
  }

  async login(dto: AuthLoginDto, request: Request): Promise<AuthResponseDto> {
    const user = await this.validateUser(dto.email, dto.password);
    return this.issueTokens(user, request);
  }

  async refresh(dto: AuthRefreshDto, request: Request): Promise<AuthResponseDto> {
    const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
      secret: this.refreshSecret,
    });
    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.refreshRepository.findOne({
      where: {
        tokenHash,
        user: { id: payload.sub },
        revokedAt: IsNull(),
      },
      relations: ['user'],
    });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedCustomException('Refresh token expired');
    }
    return this.issueTokens(stored.user, request);
  }

  async verifyActivation(
    dto: AuthActivateVerifyDto,
  ): Promise<{ valid: boolean; expiresAt?: number }> {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :identifier', { identifier })
      .getOne();

    if (!user) {
      throw new NotFoundCustomException('Email not found. Contact your admin.');
    }
    if (user.role !== UserRole.HSO) {
      throw new UnauthorizedCustomException('Invalid activation code');
    }
    if (!user.activationCodeHash || !user.activationExpiresAt) {
      throw new BadRequestCustomException('Account is not pending activation');
    }
    if (user.activationUsedAt) {
      throw new BadRequestCustomException('Activation already completed');
    }
    if (user.activationExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedCustomException(
        'Activation code expired. Contact your admin.',
      );
    }

    const activationHash = this.hashToken(dto.activationCode.trim());
    if (activationHash !== user.activationCodeHash) {
      throw new UnauthorizedCustomException('Invalid activation code');
    }

    return { valid: true, expiresAt: user.activationExpiresAt.getTime() };
  }

  async activate(dto: AuthActivateDto, request: Request): Promise<AuthResponseDto> {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :identifier', { identifier })
      .getOne();

    if (!user || user.role !== UserRole.HSO) {
      throw new UnauthorizedCustomException('Invalid activation code');
    }
    if (!user.activationCodeHash || !user.activationExpiresAt) {
      throw new BadRequestCustomException('Account is not pending activation');
    }
    if (user.activationUsedAt) {
      throw new BadRequestCustomException('Activation already completed');
    }
    if (user.activationExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedCustomException('Activation code expired');
    }

    const activationHash = this.hashToken(dto.activationCode.trim());
    if (activationHash !== user.activationCodeHash) {
      throw new UnauthorizedCustomException('Invalid activation code');
    }

    user.passwordHash = await bcrypt.hash(dto.password, 10);
    user.isActive = true;
    user.activationUsedAt = new Date();
    user.activationCodeHash = null;
    user.activationExpiresAt = null;
    const saved = await this.usersRepository.save(user);
    return this.issueTokens(saved, request);
  }

  async logout(dto: AuthRefreshDto): Promise<void> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const stored = await this.refreshRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
    });
    if (stored) {
      stored.revokedAt = new Date();
      await this.refreshRepository.save(stored);
    }
  }

  async getProfile(userId: string): Promise<AuthUserDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedCustomException('User not found');
    }
    return this.toUserDto(user);
  }

  async updateProfile(userId: string, dto: AuthUpdateProfileDto): Promise<AuthUserDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedCustomException('User not found');
    }
    const firstName = dto.firstName.trim();
    const lastName = dto.lastName.trim();
    user.fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    const saved = await this.usersRepository.save(user);
    return this.toUserDto(saved);
  }

  async changePassword(userId: string, dto: AuthChangePasswordDto): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedCustomException('User not found');
    }
    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedCustomException('Invalid password');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepository.save(user);
    await this.revokeRefreshTokens(user.id);
  }

  async changeEmail(userId: string, dto: AuthChangeEmailDto): Promise<AuthUserDto> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedCustomException('User not found');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedCustomException('Invalid password');
    }
    const newEmail = dto.email.trim().toLowerCase();
    const existing = await this.usersRepository.findOne({ where: { email: newEmail } });
    if (existing && existing.id !== user.id) {
      throw new BadRequestCustomException('Email already exists');
    }
    user.email = newEmail;
    const saved = await this.usersRepository.save(user);
    return this.toUserDto(saved);
  }

  async deleteAccount(userId: string, dto: AuthDeleteDto): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedCustomException('User not found');
    }
    if (user.role !== UserRole.CITY_MANAGER) {
      throw new UnauthorizedCustomException('Not allowed');
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedCustomException('Invalid password');
    }
    user.isActive = false;
    await this.usersRepository.save(user);
    await this.revokeRefreshTokens(user.id);
  }

  private async validateUser(email: string, password: string): Promise<UserEntity> {
    const normalized = email.trim().toLowerCase();
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :identifier', { identifier: normalized })
      .orWhere('LOWER(user.username) = :identifier', { identifier: normalized })
      .getOne();
    if (!user || !user.isActive) {
      throw new UnauthorizedCustomException('Invalid credentials');
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedCustomException('Invalid credentials');
    }
    return user;
  }

  private async issueTokens(user: UserEntity, request: Request): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      district: user.district,
      sector: user.sector,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenTtl,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTokenTtl,
    });

    const refreshEntity = this.refreshRepository.create({
      user,
      tokenHash: this.hashToken(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTokenTtl * 1000),
      userAgent: request.headers['user-agent'] ?? null,
      ip: request.ip ?? null,
    });
    await this.refreshRepository.save(refreshEntity);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenTtl,
      user: this.toUserDto(user),
    };
  }

  private toUserDto(user: UserEntity): AuthUserDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      district: user.district,
      sector: user.sector,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async revokeRefreshTokens(userId: string): Promise<void> {
    await this.refreshRepository
      .createQueryBuilder()
      .update(RefreshTokenEntity)
      .set({ revokedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .execute();
  }
}
