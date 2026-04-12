import { Column, Entity, ManyToOne } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';
import { SmsStatus } from 'src/common/enums/sms-status.enum';
import { InspectionEntity } from 'src/modules/inspections/entities/inspection.entity';

@Entity('sms_logs')
export class SmsLogEntity extends CommonEntity {
  @ManyToOne(() => InspectionEntity, { eager: true })
  inspection: InspectionEntity;

  @Column()
  phone: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: SmsStatus, default: SmsStatus.PENDING })
  status: SmsStatus;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  error?: string | null;
}
