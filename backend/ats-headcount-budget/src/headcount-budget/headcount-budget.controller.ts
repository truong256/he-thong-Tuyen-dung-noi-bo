import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth.types';
import { CurrentUser, Roles } from '../common/decorators';
import {
  BUDGET_FULL_READERS,
  BUDGET_REMAINING_READERS,
  BUDGET_WRITERS,
  Role,
} from '../common/roles.enum';
import { BudgetAuditAction } from './budget-audit-log.entity';
import { CheckBudgetDto, CreateBudgetDto, UpdateBudgetDto } from './dto/budget.dto';
import { HeadcountBudgetService } from './headcount-budget.service';

@ApiTags('Ngân sách headcount')
@ApiBearerAuth()
@Controller('headcount-budgets')
export class HeadcountBudgetController {
  constructor(private readonly service: HeadcountBudgetService) {}

  @Post()
  @Roles(...BUDGET_WRITERS)
  @ApiOperation({ summary: 'Khai báo chỉ tiêu headcount + ngân sách lương (VND) của phòng ban theo năm' })
  create(@Body() dto: CreateBudgetDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(...BUDGET_FULL_READERS)
  @ApiOperation({ summary: 'Danh sách ngân sách (kèm đã dùng / còn lại)' })
  list(@Query('year') year?: string, @Query('departmentId') departmentId?: string) {
    return this.service.list({
      year: year ? Number(year) : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
    });
  }

  @Get('remaining')
  @Roles(...BUDGET_REMAINING_READERS)
  @ApiOperation({
    summary: 'Số headcount còn lại của phòng ban (Hiring Manager chỉ xem phòng ban của mình; không lộ số liệu lương)',
  })
  async remaining(
    @CurrentUser() user: AuthUser,
    @Query('departmentId', ParseIntPipe) departmentId: number,
    @Query('year') year?: string,
  ) {
    this.assertDepartmentScope(user, departmentId);
    const y = year ? Number(year) : new Date().getFullYear();
    const summary = await this.service.summarize(departmentId, y);
    return this.canSeeSalary(user) ? summary : this.service.redactSalary(summary);
  }

  @Post('check')
  @Roles(...BUDGET_REMAINING_READERS)
  @HttpCode(200)
  @ApiOperation({ summary: 'Xem trước: một yêu cầu (số lượng, lương) có vượt chỉ tiêu không?' })
  async check(@Body() dto: CheckBudgetDto, @CurrentUser() user: AuthUser) {
    this.assertDepartmentScope(user, dto.departmentId);
    const ev = await this.service.check(dto);
    return {
      ...(this.canSeeSalary(user) ? ev : this.service.redactSalary(ev)),
      canOverride: user.roles.includes(Role.HR_MANAGER),
    };
  }

  @Get('override-logs')
  @Roles(Role.HR_MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Nhật ký ngân sách & ghi đè (chỉ đọc)' })
  logs(
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
    @Query('action', new ParseEnumPipe(BudgetAuditAction, { optional: true })) action?: BudgetAuditAction,
  ) {
    return this.service.listLogs({
      departmentId: departmentId ? Number(departmentId) : undefined,
      year: year ? Number(year) : undefined,
      action,
    });
  }

  @Get(':id')
  @Roles(...BUDGET_FULL_READERS)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @Roles(...BUDGET_WRITERS)
  @ApiOperation({ summary: 'Cập nhật chỉ tiêu / ngân sách lương (không được thấp hơn số đã dùng)' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBudgetDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...BUDGET_WRITERS)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }

  private canSeeSalary(user: AuthUser): boolean {
    return user.roles.some((r) => BUDGET_FULL_READERS.includes(r));
  }

  /** Hiring Manager / Recruiter thuần chỉ được xem phòng ban của mình. */
  private assertDepartmentScope(user: AuthUser, departmentId: number) {
    if (this.canSeeSalary(user)) return;
    if (user.departmentId !== departmentId) {
      throw new ForbiddenException({
        code: 'DEPARTMENT_SCOPE',
        message: 'Bạn chỉ được xem ngân sách của phòng ban mình.',
      });
    }
  }
}
