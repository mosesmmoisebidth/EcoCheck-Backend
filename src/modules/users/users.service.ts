import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'crypto';
import { BadRequestCustomException } from 'src/common/http/exceptions/bad-request.exception';
import { NotFoundCustomException } from 'src/common/http/exceptions/not-found.exception';
import { UserEntity } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from 'src/common/enums/user-role.enum';
import {
  KIGALI_DISTRICTS_LOWER,
  normalizeName,
} from 'src/common/constants/location.constants';
import { parseDurationToSeconds } from 'src/utils/env.util';

type CreateUserResult = {
  user: UserEntity;
  activationCode?: string;
  activationExpiresAt?: Date;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<CreateUserResult> {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersRepository.findOne({
      where: { email },
    });
    if (existing) {
      throw new BadRequestCustomException('Email already exists');
    }
    const phone = dto.phone?.trim();
    if (phone) {
      const existingByPhone = await this.usersRepository.findOne({
        where: { phone },
      });
      if (existingByPhone) {
        throw new BadRequestCustomException('Phone number already in use');
      }
    }
    const fullNameNormalized = dto.fullName.trim();
    const districtNormalized = dto.district.trim();
    if (fullNameNormalized && districtNormalized) {
      const existingByNameAndDistrict = await this.usersRepository
        .createQueryBuilder('user')
        .where('LOWER(user.fullName) = LOWER(:name)', { name: fullNameNormalized })
        .andWhere('LOWER(user.district) = LOWER(:district)', { district: districtNormalized })
        .andWhere('user.role = :role', { role: dto.role })
        .getOne();
      if (existingByNameAndDistrict) {
        throw new BadRequestCustomException(
          'A user with the same name and role already exists in this district',
        );
      }
    }
    const role = dto.role;
    const password = dto.password?.trim();
    const shouldUseActivation =
      role === UserRole.HSO ||
      (this.supportsActivation(role) && (!password || password.length === 0));
    const activationTtlSeconds = parseDurationToSeconds(
      this.configService.get<string>('ACTIVATION_CODE_EXPIRE'),
      60 * 60 * 24,
    );

    let activationCode: string | undefined;
    let activationExpiresAt: Date | undefined;
    let activationCodeHash: string | null = null;
    let isActive = true;

    if (shouldUseActivation) {
      activationCode = this.generateActivationCode();
      activationExpiresAt = new Date(Date.now() + activationTtlSeconds * 1000);
      activationCodeHash = this.hashCode(activationCode);
      isActive = false;
    } else if (!password) {
      throw new BadRequestCustomException('Password is required');
    }

    const passwordHash = await bcrypt.hash(
      password || this.generatePlaceholderSecret(),
      10,
    );

    const user = this.usersRepository.create({
      fullName: dto.fullName.trim(),
      email,
      phone: dto.phone?.trim(),
      role,
      district: dto.district.trim(),
      sector: dto.sector.trim(),
      passwordHash,
      isActive,
      activationCodeHash,
      activationExpiresAt: activationExpiresAt ?? null,
      activationUsedAt: null,
    });
    const saved = await this.usersRepository.save(user);
    return { user: saved, activationCode, activationExpiresAt };
  }

  async findAll(scopeRole: UserRole, district?: string): Promise<UserEntity[]> {
    if (scopeRole === UserRole.DISTRICT_MANAGER && district) {
      return this.usersRepository
        .createQueryBuilder('user')
        .where('LOWER(user.district) = :district', {
          district: normalizeName(district),
        })
        .getMany();
    }
    if (scopeRole === UserRole.CITY_MANAGER) {
      return this.usersRepository
        .createQueryBuilder('user')
        .where('LOWER(user.district) IN (:...districts)', {
          districts: KIGALI_DISTRICTS_LOWER,
        })
        .getMany();
    }
    return this.usersRepository.find();
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundCustomException('User not found');
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);
    Object.assign(user, {
      fullName: dto.fullName ?? user.fullName,
      phone: dto.phone ?? user.phone,
      role: dto.role ?? user.role,
      district: dto.district ?? user.district,
      sector: dto.sector ?? user.sector,
    });
    return this.usersRepository.save(user);
  }

  async setActive(id: string, isActive: boolean): Promise<UserEntity> {
    const user = await this.findOne(id);
    user.isActive = isActive;
    return this.usersRepository.save(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findOne(id);
    try {
      await this.usersRepository.remove(user);
    } catch {
      throw new BadRequestCustomException(
        'User cannot be deleted. Deactivate the user instead.',
      );
    }
  }

  async regenerateActivation(id: string): Promise<CreateUserResult> {
    const user = await this.findOne(id);
    if (!this.supportsActivation(user.role)) {
      throw new BadRequestCustomException(
        'Activation is not available for this role',
      );
    }
    if (user.isActive) {
      throw new BadRequestCustomException('User is already active');
    }
    if (!user.email) {
      throw new BadRequestCustomException('Email is required for activation');
    }

    const activationTtlSeconds = parseDurationToSeconds(
      this.configService.get<string>('ACTIVATION_CODE_EXPIRE'),
      60 * 60 * 24,
    );
    const activationCode = this.generateActivationCode();
    const activationExpiresAt = new Date(Date.now() + activationTtlSeconds * 1000);

    user.activationCodeHash = this.hashCode(activationCode);
    user.activationExpiresAt = activationExpiresAt;
    user.activationUsedAt = null;

    const saved = await this.usersRepository.save(user);
    return { user: saved, activationCode, activationExpiresAt };
  }

  private generateActivationCode(): string {
    const code = randomInt(0, 1_000_000);
    return String(code).padStart(6, '0');
  }

  private generatePlaceholderSecret(): string {
    return `${Date.now()}-${Math.random()}`;
  }

  private hashCode(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private supportsActivation(role: UserRole): boolean {
    return (
      role === UserRole.HSO ||
      role === UserRole.DISTRICT_MANAGER ||
      role === UserRole.CITY_MANAGER
    );
  }
}
