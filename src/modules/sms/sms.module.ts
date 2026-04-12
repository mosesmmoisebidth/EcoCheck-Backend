import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmsLogEntity } from './entities/sms-log.entity';
import { SmsService } from './sms.service';
import { SmsController } from './sms.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SmsLogEntity])],
  providers: [SmsService],
  controllers: [SmsController],
  exports: [SmsService],
})
export class SmsModule {}
