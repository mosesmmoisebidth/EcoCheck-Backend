import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';
import { Decision } from 'src/common/enums/decision.enum';
import { SyncStatus } from 'src/common/enums/sync-status.enum';
import { VisitType } from 'src/common/enums/visit-type.enum';
import { FacilityEntity } from 'src/modules/facilities/entities/facility.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';
import { InspectionFaultEntity } from './inspection-fault.entity';

@Entity('inspections')
export class InspectionEntity extends CommonEntity {
  @ManyToOne(() => FacilityEntity, (facility) => facility.inspections, {
    eager: true,
  })
  facility: FacilityEntity;

  @ApiProperty()
  @Column({ name: 'facilityName' })
  facilityName: string;

  @ApiProperty({ enum: VisitType })
  @Column({ type: 'enum', enum: VisitType })
  visitType: VisitType;

  @ApiProperty({ type: [String] })
  @Column({ type: 'text', array: true, name: 'teamMembers', default: '{}' })
  teamMembers: string[];

  @ApiProperty({ required: false })
  @Column({ type: 'uuid', name: 'inspectionTypeId', nullable: true })
  inspectionTypeId?: string | null;

  @ApiProperty()
  @Column({ name: 'faultCount', default: 0 })
  faultCount: number;

  @ApiProperty()
  @Column({ name: 'totalFine', default: 0 })
  totalFine: number;

  @ApiProperty()
  @Column({ name: 'adjustmentAmount', default: 0 })
  adjustmentAmount: number;

  @ApiProperty()
  @Column({ name: 'adjustmentReason', default: '' })
  adjustmentReason: string;

  @ApiProperty({ enum: Decision })
  @Column({ type: 'enum', enum: Decision })
  decision: Decision;

  @ApiProperty()
  @Column({ type: 'text', default: '' })
  comments: string;

  @ApiProperty()
  @Column({ type: 'text', default: '' })
  recommendations: string;

  @ApiProperty({ type: [String], required: false })
  @Column({ type: 'text', array: true, name: 'photoPaths', default: '{}' })
  photoPaths: string[];

  @ApiProperty({ enum: SyncStatus })
  @Column({ type: 'enum', enum: SyncStatus, default: SyncStatus.SYNCED })
  syncStatus: SyncStatus;

  @ManyToOne(() => UserEntity, (user) => user.inspections, { eager: true })
  createdBy: UserEntity;

  @OneToMany(() => InspectionFaultEntity, (fault) => fault.inspection, {
    cascade: true,
  })
  faults: InspectionFaultEntity[];
}
