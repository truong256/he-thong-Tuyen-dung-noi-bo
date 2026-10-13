import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../auth/auth.decorators';
import { AuthUser } from '../auth/auth.types';
import { Permission } from '../common/permissions';
import { CreateJobTitleDto, UpdateJobTitleDto } from './dto/job-title-body.dto';
import { ListJobTitlesQueryDto } from './dto/list-job-titles.query';
import { UpdateJobTitleStatusDto } from './dto/update-status.dto';
import { JobTitlesService } from './job-titles.service';

/**
 * Quyền được khai báo ở đây và kiểm bởi PermissionsGuard toàn cục (backend),
 * service kiểm thêm lần nữa. Việc ẩn nút/cột ở giao diện chỉ để tiện dùng, không phải bảo mật.
 */
@Controller('job-titles')
export class JobTitlesController {
  constructor(private readonly service: JobTitlesService) {}

  @Get('meta/levels')
  @RequirePermissions(Permission.JOB_TITLE_READ)
  levels(@CurrentUser() user: AuthUser) {
    return this.service.listLevels(user);
  }

  @Get()
  @RequirePermissions(Permission.JOB_TITLE_READ)
  list(@Query() query: ListJobTitlesQueryDto, @CurrentUser() user: AuthUser) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions(Permission.JOB_TITLE_READ)
  detail(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Get(':id/salary-band')
  @RequirePermissions(Permission.SALARY_BAND_READ)
  salaryBand(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() user: AuthUser) {
    return this.service.getSalaryBand(id, user);
  }

  @Post()
  @RequirePermissions(Permission.JOB_TITLE_WRITE)
  create(@Body() dto: CreateJobTitleDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Put(':id')
  @RequirePermissions(Permission.JOB_TITLE_WRITE)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateJobTitleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.JOB_TITLE_WRITE)
  setStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateJobTitleStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setStatus(id, dto.status, user);
  }
}
