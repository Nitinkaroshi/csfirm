import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly enabled: boolean;
  private readonly fromAddress: string;

  constructor(private readonly config: ConfigService) {
    this.enabled = config.get<boolean>('email.enabled', false);
    this.fromAddress = config.get<string>('email.from', 'CSFIRM <noreply@csfirm.local>');

    if (this.enabled) {
      const host = config.get<string>('email.host', 'localhost');
      const port = config.get<number>('email.port', 1025);
      const secure = config.get<boolean>('email.secure', false);
      const user = config.get<string>('email.user', '');
      const pass = config.get<string>('email.pass', '');

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        ...(user ? { auth: { user, pass } } : {}),
      });

      this.logger.log(`Email transport configured: ${host}:${port}`);
    } else {
      this.logger.log('Email disabled — logging emails to console instead');
    }
  }

  async send(params: { to: string; subject: string; html: string }) {
    if (!this.enabled || !this.transporter) {
      this.logger.log(`[EMAIL-DRY] To: ${params.to}, Subject: ${params.subject}`);
      this.logger.debug(`[EMAIL-DRY] Body: ${params.html.substring(0, 200)}...`);
      return;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
      this.logger.log(`Email sent to ${params.to}: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${params.to}: ${(error as Error).message}`);
    }
  }
}
