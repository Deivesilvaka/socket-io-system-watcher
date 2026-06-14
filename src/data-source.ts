import 'dotenv/config';
import { DataSource } from 'typeorm';
import { SystemStat } from './system-stat/system-stat.entity';
import { CreateSystemStats1749859200000 } from './migrations/1749859200000-CreateSystemStats';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'system_watcher',
  entities: [SystemStat],
  migrations: [CreateSystemStats1749859200000],
  migrationsTableName: 'migrations',
});
