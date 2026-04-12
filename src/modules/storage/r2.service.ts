import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { readEnvValue } from 'src/utils/env.util';

@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = readEnvValue(this.configService.get<string>('R2_ENDPOINT'));
    const accessKeyId = readEnvValue(this.configService.get<string>('R2_ACCESS_KEY_ID'));
    const secretAccessKey = readEnvValue(
      this.configService.get<string>('R2_SECRET_ACCESS_KEY'),
    );

    this.bucketName = readEnvValue(this.configService.get<string>('R2_BUCKET_NAME')) ?? '';
    this.publicUrl = readEnvValue(this.configService.get<string>('R2_PUBLIC_URL')) ?? '';

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    });
  }

  async uploadPdf(key: string, body: Buffer): Promise<string> {
    if (!this.bucketName) {
      throw new Error('R2 bucket name is not configured');
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: 'application/pdf',
      }),
    );
    const baseUrl = this.publicUrl.replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/${key}` : key;
  }

  async uploadImage(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.bucketName) {
      throw new Error('R2 bucket name is not configured');
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    const baseUrl = this.publicUrl.replace(/\/$/, '');
    return baseUrl ? `${baseUrl}/${key}` : key;
  }
}
