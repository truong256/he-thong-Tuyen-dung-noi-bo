import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findOne({ where: { email: (email ?? '').toLowerCase() } });
    const ok = user && user.active && (await bcrypt.compare(password ?? '', user.passwordHash));
    if (!user || !ok) {
      // Thông báo chung, không tiết lộ email có tồn tại hay không
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng.' });
    }
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      roles: user.roles,
      departmentId: user.departmentId,
    });
    return {
      accessToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, roles: user.roles, departmentId: user.departmentId },
    };
  }
}
