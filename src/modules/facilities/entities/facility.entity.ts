import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany, Index } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';
import { SyncStatus } from 'src/common/enums/sync-status.enum';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { InspectionEntity } from 'src/modules/inspections/entities/inspection.entity';

@Entity('facilities')
export class FacilityEntity extends CommonEntity {
  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty()
  @Index({ unique: true })
  @Column()
  tin: string;

  @ApiProperty()
  @Column({ name: 'ownerName' })
  ownerName: string;

  @ApiProperty()
  @Column({ name: 'ownerPhone' })
  ownerPhone: string;

  @ApiProperty({ required: false })
  @Column({ name: 'ownerEmail', type: 'text', nullable: true })
  ownerEmail?: string | null;

  @ApiProperty()
  @Column()
  district: string;

  @ApiProperty()
  @Column()
  sector: string;

  @ApiProperty()
  @Column()
  cell: string;

  @ApiProperty()
  @Column()
  village: string;

  @ApiProperty({ required: false })
  @Column({ type: 'double precision', nullable: true })
  latitude?: number | null;

  @ApiProperty({ required: false })
  @Column({ type: 'double precision', nullable: true })
  longitude?: number | null;

  @ApiProperty({ required: false })
  @Column({ name: 'photoPath', type: 'text', nullable: true })
  photoPath?: string | null;

  @ApiProperty({ enum: SyncStatus })
  @Column({ type: 'enum', enum: SyncStatus, default: SyncStatus.SYNCED })
  syncStatus: SyncStatus;

  @ManyToOne(() => UserEntity, (user) => user.facilities, {
    eager: true,
  })
  createdBy: UserEntity;

  @OneToMany(() => InspectionEntity, (inspection) => inspection.facility)
  inspections: InspectionEntity[];
}
