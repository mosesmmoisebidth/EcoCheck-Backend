import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { CommonEntity } from 'src/common/entities/common.entity';
import { UserEntity } from 'src/modules/users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshTokenEntity extends CommonEntity {
  @Index()
  @ManyToOne(() => UserEntity, { eager: true, onDelete: 'CASCADE' })
  user: UserEntity;

  @Column({ name: 'tokenHash' })
  tokenHash: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'text', nullable: true })
  ip?: string | null;
}
