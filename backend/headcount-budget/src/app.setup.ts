import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';

/** Dùng chung cho main.ts và e2e test để hành vi giống hệt nhau. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ.',
          details: errors.map((e) => ({ field: e.property, errors: Object.values(e.constraints ?? {}) })),
        }),
    }),
  );
}
