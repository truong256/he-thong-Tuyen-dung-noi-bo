import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { Public } from '../common/decorators';

/**
 * Phục vụ trang HTML tĩnh (public/index.html). Trang này KHÔNG chứa dữ liệu nghiệp vụ;
 * mọi dữ liệu + kiểm quyền vẫn đi qua API có JWT/RolesGuard ở backend.
 */
@ApiExcludeController()
@Controller()
export class UiController {
  @Public()
  @Get()
  root(@Res() res: Response) {
    return res.redirect('/app');
  }

  @Public()
  @Get('app')
  page(@Res() res: Response) {
    const file = join(process.cwd(), 'public', 'index.html');
    if (!existsSync(file)) {
      return res.status(404).json({ code: 'UI_NOT_FOUND', message: 'Không tìm thấy public/index.html' });
    }
    return res.sendFile(file);
  }
}