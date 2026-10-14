import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Mặc định: sql.js (SQLite thuần JS, lưu file ./data/ats.sqlite) -> chạy ngay trong VS Code, không cần cài DB.
 * Đặt DB_TYPE=postgres để chạy PostgreSQL đúng theo nền tảng kỹ thuật của dự án.
 */
export function buildTypeOrmOptions(): TypeOrmModuleOptions {
  if (process.env.DB_TYPE === 'postgres') {
    return {
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'ats',
      autoLoadEntities: true,
      // Production dùng db/migrations/*.sql; đặt DB_SYNC=true nếu muốn TypeORM tự tạo bảng khi dev.
      synchronize: process.env.DB_SYNC === 'true',
    };
  }

  if (process.env.DB_TYPE === 'memory') {
    return { type: 'sqljs', autoLoadEntities: true, synchronize: true };
  }

  const dir = path.resolve(process.cwd(), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return {
    type: 'sqljs',
    location: path.join(dir, 'ats.sqlite'),
    autoSave: true,
    autoLoadEntities: true,
    synchronize: true,
  };
}
