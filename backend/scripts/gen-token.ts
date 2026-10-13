import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import { loadAppConfig } from '../src/config/app.config';
import { isRole, Role } from '../src/common/roles';

/**
 * Tạo JWT để thử API bằng curl/Postman:
 *   npm run token -- HR_MANAGER
 */
const role = process.argv[2];
if (!isRole(role)) {
  console.error(`Vai trò không hợp lệ. Chọn một trong: ${Object.values(Role).join(', ')}`);
  process.exit(1);
}
const config = loadAppConfig();
const jwt = new JwtService({ secret: config.jwt.secret, signOptions: { algorithm: 'HS256', expiresIn: 3600 } });
const token = jwt.sign({ sub: `dev-${role.toLowerCase()}`, email: `${role.toLowerCase()}@dev.local`, role });
console.log(token);
