import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

/** Mã lỗi ổn định để frontend / test đối chiếu, không phụ thuộc câu chữ tiếng Việt. */
export enum ErrorCode {
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SALARY_BAND_FORBIDDEN = 'SALARY_BAND_FORBIDDEN',
  ENDPOINT_NOT_DECLARED = 'ENDPOINT_NOT_DECLARED',
  JOB_TITLE_NOT_FOUND = 'JOB_TITLE_NOT_FOUND',
  JOB_TITLE_CODE_EXISTS = 'JOB_TITLE_CODE_EXISTS',
  JOB_TITLE_NAME_LEVEL_EXISTS = 'JOB_TITLE_NAME_LEVEL_EXISTS',
  SALARY_RANGE_INVALID = 'SALARY_RANGE_INVALID',
  SALARY_AMOUNT_INVALID = 'SALARY_AMOUNT_INVALID',
}

export const SALARY_FORBIDDEN_MESSAGE =
  'Bạn không có quyền xem dải lương. Chỉ Trưởng phòng Nhân sự được xem.';

export const unauthenticated = (): UnauthorizedException =>
  new UnauthorizedException({
    statusCode: 401,
    error: 'Unauthorized',
    code: ErrorCode.UNAUTHENTICATED,
    message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
  });

export const forbidden = (code: ErrorCode, message: string): ForbiddenException =>
  new ForbiddenException({ statusCode: 403, error: 'Forbidden', code, message });

export const salaryForbidden = (): ForbiddenException =>
  forbidden(ErrorCode.SALARY_BAND_FORBIDDEN, SALARY_FORBIDDEN_MESSAGE);

export const badRequest = (code: ErrorCode, message: string): BadRequestException =>
  new BadRequestException({ statusCode: 400, error: 'Bad Request', code, message });

export const notFound = (code: ErrorCode, message: string): NotFoundException =>
  new NotFoundException({ statusCode: 404, error: 'Not Found', code, message });

export const conflict = (code: ErrorCode, message: string): ConflictException =>
  new ConflictException({ statusCode: 409, error: 'Conflict', code, message });
