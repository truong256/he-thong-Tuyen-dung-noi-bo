import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../common/auth.types';
import { CurrentUser, Roles } from '../common/decorators';
import { Role } from '../common/roles.enum';
import { ApproveDto } from '../headcount-budget/dto/budget.dto';
import { CreateRequisitionDto, ListRequisitionsQuery, StatusChangeDto } from './dto/requisition.dto';
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
  @ApiOperation({
    summary: 'Danh sách + lọc (status, departmentId, q, dueFrom, dueTo, overdue). Mỗi dòng có isOverdue/daysOverdue.',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: ListRequisitionsQuery) {
    return this.service.list(user, query);
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

  @Post(':id/hold')
  @Roles(...REQ_WRITERS)
  @HttpCode(200)
  @ApiOperation({ summary: 'S3-07: Tạm dừng yêu cầu đã duyệt (bắt buộc lý do). Headcount được trả lại ngân sách.' })
  hold(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusChangeDto, @CurrentUser() user: AuthUser) {
    return this.service.hold(id, user, dto.reason);
  }

  @Post(':id/resume')
  @Roles(...REQ_APPROVERS)
  @HttpCode(200)
  @ApiOperation({ summary: 'S3-07: Tiếp tục yêu cầu đang tạm dừng — kiểm lại ngân sách như khi duyệt.' })
  resume(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveDto, @CurrentUser() user: AuthUser) {
    return this.service.resume(id, dto, user);
  }

  @Post(':id/close')
  @Roles(...REQ_WRITERS)
  @HttpCode(200)
  @ApiOperation({ summary: 'S3-07: Đóng yêu cầu (đã duyệt hoặc đang tạm dừng), bắt buộc lý do.' })
  close(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusChangeDto, @CurrentUser() user: AuthUser) {
    return this.service.close(id, user, dto.reason);
  }

  @Post(':id/cancel')
  @Roles(...REQ_WRITERS)
  @HttpCode(200)
  @ApiOperation({ summary: 'S3-07: Huỷ yêu cầu (bắt buộc lý do). Headcount được trả lại ngân sách.' })
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: StatusChangeDto, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user, dto.reason);
  }
}
