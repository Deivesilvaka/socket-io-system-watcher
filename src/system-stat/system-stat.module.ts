import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemStat } from './system-stat.entity';
import { SystemStatService } from './system-stat.service';
import { SystemStatController } from './system-stat.controller';
import { ReportService } from './report.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemStat])],
  controllers: [SystemStatController],
  providers: [SystemStatService, ReportService],
  exports: [SystemStatService],
})
export class SystemStatModule {}
