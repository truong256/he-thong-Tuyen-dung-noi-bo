import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadAppConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const config = loadAppConfig(); // ném lỗi sớm nếu cấu hình production không an toàn
  const app = await NestFactory.create(AppModule);
  configureApp(app, config.corsOrigins);
  app.enableShutdownHooks();
  await app.listen(config.port);
  new Logger('Bootstrap').log(`API chạy tại http://localhost:${config.port}/api`);
}

void bootstrap();
