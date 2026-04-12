import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryService } from './cloudinary.service';
import { R2Service } from './r2.service';

@Module({
  imports: [ConfigModule],
  providers: [CloudinaryService, R2Service],
  exports: [CloudinaryService, R2Service],
})
export class StorageModule {}
