import { loadAppConfig } from './app.config';

const SECRET = 'x'.repeat(40);

describe('loadAppConfig', () => {
  it('có giá trị mặc định an toàn cho môi trường dev', () => {
    const cfg = loadAppConfig({});
    expect(cfg.port).toBe(3000);
    expect(cfg.devLoginEnabled).toBe(false);
    expect(cfg.db.synchronize).toBe(false);
    expect(cfg.corsOrigins).toEqual(['http://localhost:5173']);
    expect(cfg.jwt.expiresInSeconds).toBe(900);
  });

  it('đọc cấu hình từ biến môi trường', () => {
    const cfg = loadAppConfig({
      PORT: '4000',
      DB_PORT: '6543',
      DB_SSL: 'true',
      AUTH_DEV_LOGIN: 'true',
      CORS_ORIGINS: 'http://a.com, http://b.com',
      JWT_EXPIRES_IN_SECONDS: '60',
    });
    expect(cfg).toMatchObject({ port: 4000, devLoginEnabled: true });
    expect(cfg.db).toMatchObject({ port: 6543, ssl: true });
    expect(cfg.corsOrigins).toEqual(['http://a.com', 'http://b.com']);
    expect(cfg.jwt.expiresInSeconds).toBe(60);
  });

  it('từ chối PORT không phải số nguyên dương', () => {
    expect(() => loadAppConfig({ PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadAppConfig({ PORT: '-1' })).toThrow(/PORT/);
  });

  it('production bắt buộc JWT_SECRET đủ mạnh', () => {
    expect(() => loadAppConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => loadAppConfig({ NODE_ENV: 'production', JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
    expect(loadAppConfig({ NODE_ENV: 'production', JWT_SECRET: SECRET }).jwt.secret).toBe(SECRET);
  });

  it('production cấm bật đăng nhập giả lập', () => {
    expect(() =>
      loadAppConfig({ NODE_ENV: 'production', JWT_SECRET: SECRET, AUTH_DEV_LOGIN: 'true' }),
    ).toThrow(/AUTH_DEV_LOGIN/);
  });
});
