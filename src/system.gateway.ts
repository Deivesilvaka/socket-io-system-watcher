import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Interval } from '@nestjs/schedule';
import { SystemStatService } from './system-stat/system-stat.service';
import { MailService } from './mail/mail.service';

export const CPU_ALERT_THRESHOLD = 90;

@WebSocketGateway({ cors: { origin: '*' } })
export class SystemGateway {

  private readonly logger = new Logger(SystemGateway.name);
  private cpuAlertSent = false;

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly systemStatService: SystemStatService,
    private readonly mailService: MailService,
  ) {}

  @Interval(3000)
  async handleInterval() {
    const stats = {
      cpu: (Math.random() * 100).toFixed(2),
      ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      timestamp: new Date().toLocaleTimeString(),
    };

    this.server.emit('systemStats', stats);
    await this.systemStatService.save(stats);

    const cpuValue = parseFloat(stats.cpu);

    if (cpuValue >= CPU_ALERT_THRESHOLD && !this.cpuAlertSent) {
      this.cpuAlertSent = true;
      this.logger.warn(`CPU em ${stats.cpu}% — limite de ${CPU_ALERT_THRESHOLD}% atingido. Enviando alerta por email.`);
      this.mailService.sendCpuAlert(stats.cpu, stats.timestamp).catch((err) => {
        this.logger.error(`Falha ao enviar alerta de CPU: ${err.message}`);
      });
    } else if (cpuValue < CPU_ALERT_THRESHOLD) {
      this.cpuAlertSent = false;
    }

    console.log('Stats enviados via Cron Interval');
  }
}
