import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * Cấu hình dùng chung cho main.ts và e2e test để test chạy đúng pipeline thật.
 */
export function configureApp(app: INestApplication, corsOrigins: string[] = []): void {
  app.setGlobalPrefix('api');
  app.use(helmet());

  // Phản hồi có thể chứa dải lương => cấm cache ở trình duyệt/proxy dùng chung.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Authorization');
    next();
  });

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
