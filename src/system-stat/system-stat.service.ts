import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { SystemStat } from './system-stat.entity';

@Injectable()
export class SystemStatService {
  constructor(
    @InjectRepository(SystemStat)
    private readonly repository: Repository<SystemStat>,
  ) {}

  async save(data: { cpu: string; ram: string }): Promise<void> {
    const stat = this.repository.create({
      cpu: parseFloat(data.cpu),
      ram: parseFloat(data.ram),
    });
    await this.repository.save(stat);
  }

  async findByPeriod(startDate: Date, endDate: Date): Promise<SystemStat[]> {
    return this.repository.find({
      where: { createdAt: Between(startDate, endDate) },
      order: { createdAt: 'ASC' },
    });
  }
}
