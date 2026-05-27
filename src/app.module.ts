import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConfig } from './config/database.config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { InspectionsModule } from './modules/inspections/inspections.module';
import { FaultsModule } from './modules/faults/faults.module';
import { InspectionTypesModule } from './modules/inspection-types/inspection-types.module';
import { SyncModule } from './modules/sync/sync.module';
import { SmsModule } from './modules/sms/sms.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { MailModule } from './modules/mail/mail.module';
import { StorageModule } from './modules/storage/storage.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AiModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(databaseConfig()),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    HealthModule,
    AuthModule,
    UsersModule,
    FacilitiesModule,
    InspectionsModule,
    FaultsModule,
    InspectionTypesModule,
    SyncModule,
    SmsModule,
    ReportsModule,
    AuditModule,
    MailModule,
    StorageModule,
    LocationsModule,
    DashboardModule,
    AiModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}