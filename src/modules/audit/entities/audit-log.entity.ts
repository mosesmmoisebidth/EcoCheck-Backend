import { Column, Entity } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';

@Entity('audit_logs')
export class AuditLogEntity extends CommonEntity {
  @Column({ name: 'userId', type: 'text', nullable: true })
  userId?: string | null;

  @Column()
  action: string;

  @Column({ name: 'entityType' })
  entityType: string;

  @Column({ name: 'entityId', type: 'text', nullable: true })
  entityId?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  before?: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  after?: Record<string, any> | null;
}
