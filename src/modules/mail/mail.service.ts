import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { envToBool, envToNumber, readEnvValue } from 'src/utils/env.util';

type SendMailOptions = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = readEnvValue(this.configService.get<string>('SMTP_HOST'));
    const port = envToNumber(this.configService.get<string>('SMTP_PORT'), 465);
    const secure = envToBool(this.configService.get<string>('SMTP_SECURE'), port === 465);
    const requireTls = envToBool(
      this.configService.get<string>('SMTP_REQUIRE_TLS'),
      false,
    );
    const ignoreTls = envToBool(
      this.configService.get<string>('SMTP_IGNORE_TLS'),
      false,
    );
    const rejectUnauthorized = envToBool(
      this.configService.get<string>('SMTP_TLS_REJECT_UNAUTHORIZED'),
      true,
    );
    const user = readEnvValue(this.configService.get<string>('EMAIL_ADDRESS'));
    const pass = readEnvValue(this.configService.get<string>('EMAIL_PASSWORD'));
    const fromName = readEnvValue(this.configService.get<string>('EMAIL_FROM_NAME'));

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      requireTLS: requireTls,
      ignoreTLS: ignoreTls,
      tls: { rejectUnauthorized },
    });

    this.fromAddress = fromName && user ? `${fromName} <${user}>` : user ?? '';
    if (!host) {
      this.logger.warn('SMTP_HOST is not set; email delivery will fail.');
    }
    if (!user || !pass) {
      this.logger.warn('EMAIL_ADDRESS or EMAIL_PASSWORD is missing; email delivery will fail.');
    }
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP send failed: ${message}`);
      throw error;
    }
  }
}
