import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { readEnvValue } from 'src/utils/env.util';

@Injectable()
export class CloudinaryService {
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const cloudName = readEnvValue(this.configService.get<string>('CLOUDINARY_NAME'));
    const apiKey = readEnvValue(this.configService.get<string>('CLOUDINARY_API_KEY'));
    const apiSecret = readEnvValue(this.configService.get<string>('CLOUDINARY_SECRET_KEY'));

    this.isConfigured = Boolean(cloudName && apiKey && apiSecret);
    if (this.isConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async uploadImage(
    data: string,
    options?: { folder?: string; publicId?: string },
  ): Promise<{ url: string; publicId: string }> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }
    const result = await cloudinary.uploader.upload(data, {
      resource_type: 'image',
      folder: options?.folder,
      public_id: options?.publicId,
    });
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }
}
