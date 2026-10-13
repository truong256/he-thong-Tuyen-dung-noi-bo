import { Body, Controller, Get, HttpCode, Param, ParseEnumPipe, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth.types';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/roles.enum';
import { ApproveDto } from '../headcount-budget/dto/budget.dto';
import { CreateRequisitionDto } from './dto/requisition.dto';
import { RequisitionStatus } from './requisition.entity';
import { RequisitionsService } from './requisitions.service';

const REQ_WRITERS = [Role.HIRING_MANAGER, Role.RECRUITER, Role.HR_MANAGER, Role.ADMIN];
const REQ_READERS = [...REQ_WRITERS, Role.APPROVER];
const REQ_APPROVERS = [Role.APPROVER, Role.HR_MANAGER, Role.ADMIN];

@ApiTags('Yêu cầu tuyển dụng (bản tối thiểu phục vụ S3-04)')
@ApiBearerAuth()
@Controller('requisitions')
export class RequisitionsController {
  constructor(private readonly service: RequisitionsService) {}

  @Post()
  @Roles(...REQ_WRITERS)
  @ApiOperation({ summary: 'Tạo yêu cầu (nháp) — phản hồi kèm số headcount còn lại của phòng ban' })
  create(@Body() dto: CreateRequisitionDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(...REQ_READERS)
  list(
    @CurrentUser() user: AuthUser,
    @Query('departmentId') departmentId?: string,
    @Query('status', new ParseEnumPipe(RequisitionStatus, { optional: true })) status?: RequisitionStatus,
  ) {
    return this.service.list(user, { departmentId: departmentId ? Number(departmentId) : undefined, status });
  }

  @Get(':id')
  @Roles(...REQ_READERS)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Post(':id/submit')
  @Roles(...REQ_WRITERS)
  @HttpCode(200)
  submit(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.submit(id, user);
  }

  @Post(':id/approve')
  @Roles(...REQ_APPROVERS)
  @HttpCode(200)
  @ApiOperation({
    summary: 'Duyệt yêu cầu. Vượt chỉ tiêu => 409; chỉ HR Manager gửi { override: { reason } } mới qua được (có ghi nhật ký).',
  })
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveDto, @CurrentUser() user: AuthUser) {
    return this.service.approve(id, dto, user);
  }

  @Post(':id/cancel')
  @Roles(...REQ_WRITERS)
  @HttpCode(200)
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user);
  }
}
