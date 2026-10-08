import { IsEnum } from 'class-validator';
import { JobTitleStatus } from '../job-title.types';

export class UpdateJobTitleStatusDto {
  @IsEnum(JobTitleStatus, { message: 'Trạng thái không hợp lệ (ACTIVE hoặc INACTIVE)' })
  status!: JobTitleStatus;
}
