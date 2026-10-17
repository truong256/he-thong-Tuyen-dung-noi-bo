import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Public } from '../common/decorators';
import { AuthService } from './auth.service';

class LoginDto {
  @ApiProperty({ example: 'hr.manager@company.vn' })
  @IsString()
  email: string;

  @ApiProperty({ example: 'Passw0rd!' })
  @IsString()
  password: string;
}

@ApiTags('Đăng nhập')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
