import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SystemGateway } from './system.gateway';

@Module({
  imports: [
    ScheduleModule.forRoot()
  ],
  providers: [SystemGateway],
})
export class AppModule {}