import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
  ) {}

  async log(params: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
  }) {
    const entry = this.auditRepository.create({
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
    });
    return this.auditRepository.save(entry);
  }
}
