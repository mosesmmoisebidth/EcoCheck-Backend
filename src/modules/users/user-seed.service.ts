import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { UserEntity } from './entities/user.entity';
import { UserRole } from 'src/common/enums/user-role.enum';
import { envToBool } from 'src/utils/env.util';

@Injectable()
export class UserSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const resetPasswords = this.getBool('SEED_RESET_PASSWORDS', false);
    const forceActive = this.getBool('SEED_FORCE_ACTIVE', false);
    const seeds = [
      {
        email:
          this.getValue('SEED_HSO_EMAIL') ??
          this.getValue('SEED_EMAIL') ??
          this.getValue('SEED_HSO_USERNAME') ??
          this.getValue('SEED_USERNAME') ??
          'inspector@example.com',
        username:
          this.getValue('SEED_HSO_USERNAME') ??
          this.getValue('SEED_USERNAME') ??
          'inspector',
        password:
          this.getValue('SEED_HSO_PASSWORD') ??
          this.getValue('SEED_PASSWORD') ??
          'Passw0rd!',
        fullName:
          this.getValue('SEED_HSO_FULL_NAME') ??
          this.getValue('SEED_FULL_NAME') ??
          'Alice Inspector',
        role: this.resolveRole(
          this.getValue('SEED_HSO_ROLE') ?? this.getValue('SEED_ROLE'),
          UserRole.HSO,
        ),
        district:
          this.getValue('SEED_HSO_DISTRICT') ??
          this.getValue('SEED_DISTRICT') ??
          'Gasabo',
        sector:
          this.getValue('SEED_HSO_SECTOR') ??
          this.getValue('SEED_SECTOR') ??
          'Kacyiru',
      },
      {
        email:
          this.getValue('SEED_DM_EMAIL') ??
          this.getValue('SEED_DM_USERNAME') ??
          'district_manager@example.com',
        username: this.getValue('SEED_DM_USERNAME') ?? 'district_manager',
        password: this.getValue('SEED_DM_PASSWORD') ?? 'Passw0rd!',
        fullName: this.getValue('SEED_DM_FULL_NAME') ?? 'David Manager',
        role: this.resolveRole(
          this.getValue('SEED_DM_ROLE'),
          UserRole.DISTRICT_MANAGER,
        ),
        district: this.getValue('SEED_DM_DISTRICT') ?? 'Gasabo',
        sector: this.getValue('SEED_DM_SECTOR') ?? 'Kacyiru',
      },
      {
        email:
          this.getValue('SEED_CITY_EMAIL') ??
          this.getValue('SEED_CITY_USERNAME') ??
          'city_manager@example.com',
        username: this.getValue('SEED_CITY_USERNAME') ?? 'city_manager',
        password: this.getValue('SEED_CITY_PASSWORD') ?? 'Passw0rd!',
        fullName: this.getValue('SEED_CITY_FULL_NAME') ?? 'Caroline City',
        role: this.resolveRole(
          this.getValue('SEED_CITY_ROLE'),
          UserRole.CITY_MANAGER,
        ),
        district: this.getValue('SEED_CITY_DISTRICT') ?? 'Kigali',
        sector: this.getValue('SEED_CITY_SECTOR') ?? 'City HQ',
      },
      {
        email:
          this.getValue('SEED_SUPER_EMAIL') ??
          this.getValue('SEED_SUPER_USERNAME') ??
          'super_admin@example.com',
        username: this.getValue('SEED_SUPER_USERNAME') ?? 'super_admin',
        password: this.getValue('SEED_SUPER_PASSWORD') ?? 'Passw0rd!',
        fullName: this.getValue('SEED_SUPER_FULL_NAME') ?? 'Super Admin',
        role: this.resolveRole(
          this.getValue('SEED_SUPER_ROLE'),
          UserRole.SUPER_ADMIN,
        ),
        district: this.getValue('SEED_SUPER_DISTRICT') ?? 'Kigali',
        sector: this.getValue('SEED_SUPER_SECTOR') ?? 'Head Office',
      },
    ];

    for (const seed of seeds) {
      const email = seed.email?.trim().toLowerCase();
      if (!email || !seed.password) {
        continue;
      }
      const existing = await this.usersRepository.findOne({
        where: [{ email }, { username: seed.username }],
      });
      if (existing) {
        let shouldSave = false;
        if (forceActive && !existing.isActive) {
          existing.isActive = true;
          shouldSave = true;
        }
        if (!existing.email || existing.email !== email) {
          existing.email = email;
          shouldSave = true;
        }
        if (seed.fullName && existing.fullName !== seed.fullName) {
          existing.fullName = seed.fullName;
          shouldSave = true;
        }
        if (resetPasswords && seed.password) {
          existing.passwordHash = await bcrypt.hash(seed.password, 10);
          shouldSave = true;
        }
        if (shouldSave) {
          await this.usersRepository.save(existing);
        }
        continue;
      }
      const passwordHash = await bcrypt.hash(seed.password, 10);
      const user = this.usersRepository.create({
        fullName: seed.fullName,
        email,
        role: seed.role,
        district: seed.district,
        sector: seed.sector,
        passwordHash,
        isActive: true,
      });
      await this.usersRepository.save(user);
    }
  }

  private getValue(key: string): string | undefined {
    return this.configService.get<string>(key)?.trim() || undefined;
  }

  private resolveRole(value: string | undefined, fallback: UserRole): UserRole {
    if (!value) {
      return fallback;
    }
    return Object.values(UserRole).includes(value as UserRole)
      ? (value as UserRole)
      : fallback;
  }

  private getBool(key: string, defaultValue = false): boolean {
    return envToBool(this.configService.get<string>(key), defaultValue);
  }
}
