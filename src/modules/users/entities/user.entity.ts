import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';
import { UserRole } from 'src/common/enums/user-role.enum';
import { FacilityEntity } from 'src/modules/facilities/entities/facility.entity';
import { InspectionEntity } from 'src/modules/inspections/entities/inspection.entity';

@Entity('users')
export class UserEntity extends CommonEntity {
  @ApiProperty()
  @Column({ name: 'fullName' })
  fullName: string;

  @ApiProperty()
  @Column({ unique: true, nullable: true })
  username?: string;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @ApiProperty({ required: false })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @ApiProperty()
  @Column()
  district: string;

  @ApiProperty()
  @Column()
  sector: string;

  @Column({ name: 'passwordHash' })
  passwordHash: string;

  @Column({ name: 'activationCodeHash', type: 'text', nullable: true })
  activationCodeHash?: string | null;

  @Column({ name: 'activationExpiresAt', type: 'timestamptz', nullable: true })
  activationExpiresAt?: Date | null;

  @Column({ name: 'activationUsedAt', type: 'timestamptz', nullable: true })
  activationUsedAt?: Date | null;

  @ApiProperty({ default: true })
  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => FacilityEntity, (facility) => facility.createdBy)
  facilities: FacilityEntity[];

  @OneToMany(() => InspectionEntity, (inspection) => inspection.createdBy)
  inspections: InspectionEntity[];
}
