import { AuthUser } from '../../src/auth/auth.types';
import { Role } from '../../src/common/roles';
import { CreateJobTitleDto } from '../../src/job-titles/dto/job-title-body.dto';
import { JobLevel } from '../../src/job-titles/job-title.types';

export const userOf = (role: Role): AuthUser => ({
  id: `user-${role.toLowerCase()}`,
  email: `${role.toLowerCase()}@test.local`,
  role,
});

export const HR = userOf(Role.HR_MANAGER);

export const NON_HR_ROLES = Object.values(Role).filter((r) => r !== Role.HR_MANAGER);

export const sampleDto = (overrides: Partial<CreateJobTitleDto> = {}): CreateJobTitleDto => ({
  code: 'DEV-SR',
  name: 'Lập trình viên',
  level: JobLevel.SENIOR,
  salaryMin: 28_000_000,
  salaryMax: 45_000_000,
  description: 'Phát triển phần mềm',
  ...overrides,
});
