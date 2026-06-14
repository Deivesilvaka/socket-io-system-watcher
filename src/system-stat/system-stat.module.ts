import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemStat } from './system-stat.entity';
import { SystemStatService } from './system-stat.service';

@Module({
  imports: [TypeOrmModule.forFeature([SystemStat])],
  providers: [SystemStatService],
  exports: [SystemStatService],
})
export class SystemStatModule {}
