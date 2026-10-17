import 'reflect-metadata';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  // Giao diện ngân sách & cảnh báo vượt chỉ tiêu (thư mục ./public) -> http://localhost:3000/ui/
  app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/ui' });

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('ATS — S3-04 Quản lý ngân sách headcount')
      .setDescription('SCRUM-123/124/125/127. Đăng nhập tại POST /auth/login rồi bấm Authorize.')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, doc);

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API:     http://localhost:${port}\nGiao diện: http://localhost:${port}/ui/\nSwagger: http://localhost:${port}/docs`);
}
bootstrap();
