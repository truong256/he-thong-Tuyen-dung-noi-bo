import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  corsOrigins: string[];
  jwt: { secret: string; expiresInSeconds: number };
  /** Đăng nhập giả lập theo vai trò, CHỈ để demo cho tới khi có S1-01. */
  devLoginEnabled: boolean;
  db: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
    ssl: boolean;
    synchronize: boolean;
  };
}

const DEV_JWT_SECRET = 'dev-only-secret-change-me-dev-only-secret-change-me';

function toInt(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Biến môi trường ${name} phải là số nguyên dương (nhận được "${raw}")`);
  }
  return n;
}

const toBool = (raw: string | undefined, fallback = false): boolean =>
  raw === undefined || raw === '' ? fallback : ['1', 'true', 'yes'].includes(raw.toLowerCase());

/**
 * Đọc và kiểm tra cấu hình từ biến môi trường. Hàm thuần để dễ unit test.
 * Ném lỗi ngay lúc khởi động nếu cấu hình production không an toàn.
 */
export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';
  const secret = env.JWT_SECRET ?? (isProd ? '' : DEV_JWT_SECRET);
  const devLoginEnabled = toBool(env.AUTH_DEV_LOGIN, false);

  if (isProd) {
    if (secret.length < 32 || secret === DEV_JWT_SECRET) {
      throw new Error('JWT_SECRET production phải dài tối thiểu 32 ký tự và khác giá trị mặc định');
    }
    if (devLoginEnabled) {
      throw new Error('AUTH_DEV_LOGIN không được bật khi NODE_ENV=production');
    }
  }

  return {
    nodeEnv,
    port: toInt(env.PORT, 3000, 'PORT'),
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    jwt: { secret, expiresInSeconds: toInt(env.JWT_EXPIRES_IN_SECONDS, 900, 'JWT_EXPIRES_IN_SECONDS') },
    devLoginEnabled,
    db: {
      host: env.DB_HOST ?? 'localhost',
      port: toInt(env.DB_PORT, 5432, 'DB_PORT'),
      username: env.DB_USER ?? 'recruit',
      password: env.DB_PASSWORD ?? 'recruit',
      database: env.DB_NAME ?? 'recruitment',
      ssl: toBool(env.DB_SSL, false),
      synchronize: toBool(env.DB_SYNCHRONIZE, false),
    },
  };
}

export default registerAs('app', loadAppConfig);
