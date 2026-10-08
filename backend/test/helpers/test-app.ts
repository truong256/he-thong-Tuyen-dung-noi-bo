import 'reflect-metadata';
import { Controller, Get, INestApplication, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configureApp } from '../../src/app.setup';
import { AuthModule } from '../../src/auth/auth.module';
import appConfig from '../../src/config/app.config';
import { Role } from '../../src/common/roles';
import { HealthController } from '../../src/health.controller';
import { JobTitle } from '../../src/job-titles/job-title.entity';
import { JobTitlesModule } from '../../src/job-titles/job-titles.module';

export const TEST_SECRET = 'e2e-test-secret-e2e-test-secret-123456';

/** Controller cố tình KHÔNG khai báo quyền, để chứng minh nguyên tắc mặc định từ chối. */
@Controller('undeclared')
export class UndeclaredController {
  @Get()
  open() {
    return { leaked: true };
  }
}

export async function createTestApp(options: { devLogin?: boolean } = {}): Promise<INestApplication> {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.AUTH_DEV_LOGIN = options.devLogin ? 'true' : 'false';

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [appConfig] }),
      TypeOrmModule.forRoot({ type: 'sqljs', entities: [JobTitle], synchronize: true, autoSave: false }),
      AuthModule,
      JobTitlesModule,
    ],
    controllers: [HealthController, UndeclaredController as Type<unknown>],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app, ['http://localhost:5173']);
  await app.init();
  return app;
}

export function tokenFor(role: Role, options: { secret?: string; expiresIn?: number } = {}): string {
  const jwt = new JwtService({ secret: options.secret ?? TEST_SECRET });
  return jwt.sign(
    { sub: `e2e-${role.toLowerCase()}`, email: `${role.toLowerCase()}@e2e.local`, role },
    { algorithm: 'HS256', expiresIn: options.expiresIn ?? 600 },
  );
}

export const bearer = (role: Role): { Authorization: string } => ({ Authorization: `Bearer ${tokenFor(role)}` });
