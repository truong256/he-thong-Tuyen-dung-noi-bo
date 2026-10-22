import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import appConfig from '../config/app.config';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        secret: config.jwt.secret,
        signOptions: { algorithm: 'HS256', expiresIn: config.jwt.expiresInSeconds },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Thứ tự quan trọng: xác thực trước, phân quyền sau. Cả hai áp dụng cho MỌI endpoint.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AuthModule {}
