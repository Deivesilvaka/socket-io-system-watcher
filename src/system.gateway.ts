import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Interval } from '@nestjs/schedule';

@WebSocketGateway({ cors: { origin: '*' } })
export class SystemGateway {
  
  @WebSocketServer()
  private server!: Server;

  @Interval(1000)
  handleInterval() {
    const stats = {
      cpu: (Math.random() * 100).toFixed(2),
      ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      timestamp: new Date().toLocaleTimeString(),
    };

    this.server.emit('systemStats', stats);
    
    console.log('Stats enviados via Cron Interval');
  }
}