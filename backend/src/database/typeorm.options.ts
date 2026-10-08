import { DataSourceOptions } from 'typeorm';
import { AppConfig } from '../config/app.config';
import { JobTitle } from '../job-titles/job-title.entity';
import { CreateJobTitles1730000000000 } from './migrations/1730000000000-CreateJobTitles';

export function buildPostgresOptions(db: AppConfig['db']): DataSourceOptions {
  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    ssl: db.ssl ? { rejectUnauthorized: false } : false,
    entities: [JobTitle],
    migrations: [CreateJobTitles1730000000000],
    synchronize: db.synchronize,
    // Múi giờ phiên làm việc của DB để now() nhất quán; thời điểm lưu là timestamptz (UTC).
    extra: { options: '-c timezone=UTC' },
  };
}
