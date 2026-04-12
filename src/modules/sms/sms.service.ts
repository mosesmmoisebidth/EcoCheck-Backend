import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmsLogEntity } from './entities/sms-log.entity';
import { SmsStatus } from 'src/common/enums/sms-status.enum';
import { InspectionEntity } from '../inspections/entities/inspection.entity';

@Injectable()
export class SmsService {
  constructor(
    @InjectRepository(SmsLogEntity)
    private readonly smsRepository: Repository<SmsLogEntity>,
  ) {}

  async logPending(inspection: InspectionEntity, phone: string, message: string) {
    const log = this.smsRepository.create({
      inspection,
      phone,
      message,
      status: SmsStatus.PENDING,
    });
    return this.smsRepository.save(log);
  }

  async findRecent(limit = 20): Promise<SmsLogEntity[]> {
    return this.smsRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
