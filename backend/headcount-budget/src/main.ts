import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

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
  console.log(`API:     http://localhost:${port}\nSwagger: http://localhost:${port}/docs`);
}
bootstrap();
