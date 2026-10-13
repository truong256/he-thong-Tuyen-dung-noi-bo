import { IsEnum } from 'class-validator';
import { Role } from '../common/roles';

export class DevLoginDto {
  @IsEnum(Role, { message: 'Vai trò không hợp lệ' })
  role!: Role;
}
