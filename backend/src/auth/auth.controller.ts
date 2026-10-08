import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Post } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import appConfig from '../config/app.config';
import { Role, ROLE_LABELS_VI } from '../common/roles';
import { Public } from './auth.decorators';
import { AccessTokenPayload } from './auth.types';
import { DevLoginDto } from './dev-login.dto';

/**
 * Đăng nhập GIẢ LẬP theo vai trò để demo S2-05 khi chưa có module đăng nhập thật (S1-01).
 * Chỉ hoạt động khi AUTH_DEV_LOGIN=true và bị cấm bật ở production (xem app.config.ts).
 * Khi S1-01 hoàn thành: xoá controller này, giữ nguyên JwtAuthGuard / PermissionsGuard.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
  ) {}

  @Public()
  @Post('dev-login')
  @HttpCode(200)
  async devLogin(@Body() dto: DevLoginDto) {
    if (!this.config.devLoginEnabled) throw new NotFoundException();

    const payload: AccessTokenPayload = {
      sub: `dev-${dto.role.toLowerCase()}`,
      email: `${dto.role.toLowerCase()}@dev.local`,
      role: dto.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      user: { id: payload.sub, email: payload.email, role: dto.role, roleLabel: ROLE_LABELS_VI[dto.role] },
    };
  }

  /** Danh sách vai trò cho màn hình demo. */
  @Public()
  @Get('dev-roles')
  devRoles() {
    if (!this.config.devLoginEnabled) throw new NotFoundException();
    return Object.values(Role).map((role) => ({ role, label: ROLE_LABELS_VI[role] }));
  }
}
