import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('MAIL_HOST'),
      port: this.config.get<number>('MAIL_PORT'),
      auth: {
        user: this.config.get<string>('MAIL_USER'),
        pass: this.config.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendCpuAlert(cpu: string, timestamp: string): Promise<void> {
    const to = this.config.get<string>('MAIL_ALERT_TO');
    const senderName = this.config.get<string>('MAIL_SENDER_NAME_DEFAULT', 'SystemWatcher');
    const senderAddress = this.config.get<string>('MAIL_SENDER_DEFAULT', 'no-reply@example.com');

    await this.transporter.sendMail({
      from: `"${senderName}" <${senderAddress}>`,
      to,
      subject: '[SystemWatcher] Alerta: CPU acima de 90%',
      html: `
        <h2 style="color:#c0392b;">⚠️ Alerta de CPU Crítico</h2>
        <p>O uso do processador ultrapassou o limite de <strong>90%</strong>.</p>
        <table style="border-collapse:collapse;margin-top:12px;">
          <tr>
            <td style="padding:4px 12px 4px 0;font-weight:bold;">CPU:</td>
            <td style="color:#c0392b;font-weight:bold;">${cpu}%</td>
          </tr>
          <tr>
            <td style="padding:4px 12px 4px 0;font-weight:bold;">Horário:</td>
            <td>${timestamp}</td>
          </tr>
        </table>
        <p style="margin-top:16px;color:#7f8c8d;font-size:12px;">
          Gerado automaticamente pelo SystemWatcher.
        </p>
      `,
    });

    this.logger.log(`Alerta de CPU enviado para ${to}`);
  }
}
