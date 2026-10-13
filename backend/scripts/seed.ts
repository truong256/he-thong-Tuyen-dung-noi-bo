import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthUser } from '../src/auth/auth.types';
import { Role } from '../src/common/roles';
import { JobTitlesService } from '../src/job-titles/job-titles.service';
import { JobLevel } from '../src/job-titles/job-title.types';
import { JobTitle } from '../src/job-titles/job-title.entity';
import { DataSource } from 'typeorm';

const hr: AuthUser = { id: 'seed-script', email: 'seed@dev.local', role: Role.HR_MANAGER };

const SAMPLES = [
  { code: 'INTERN-DEV', name: 'Thực tập sinh Lập trình', level: JobLevel.INTERN, salaryMin: 3_000_000, salaryMax: 5_000_000 },
  { code: 'FRESHER-DEV', name: 'Lập trình viên', level: JobLevel.FRESHER, salaryMin: 8_000_000, salaryMax: 12_000_000 },
  { code: 'JUNIOR-DEV', name: 'Lập trình viên', level: JobLevel.JUNIOR, salaryMin: 12_000_000, salaryMax: 18_000_000 },
  { code: 'MIDDLE-DEV', name: 'Lập trình viên', level: JobLevel.MIDDLE, salaryMin: 18_000_000, salaryMax: 28_000_000 },
  { code: 'SENIOR-DEV', name: 'Lập trình viên', level: JobLevel.SENIOR, salaryMin: 28_000_000, salaryMax: 45_000_000 },
  { code: 'TL-DEV', name: 'Trưởng nhóm Phát triển', level: JobLevel.LEAD, salaryMin: 40_000_000, salaryMax: 60_000_000 },
  { code: 'HR-EXEC', name: 'Chuyên viên Nhân sự', level: JobLevel.MIDDLE, salaryMin: 12_000_000, salaryMax: 20_000_000 },
  { code: 'MGR-HR', name: 'Trưởng phòng Nhân sự', level: JobLevel.MANAGER, salaryMin: 35_000_000, salaryMax: 55_000_000 },
  { code: 'DIR-TECH', name: 'Giám đốc Công nghệ', level: JobLevel.DIRECTOR, salaryMin: 80_000_000, salaryMax: 150_000_000 },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const service = app.get(JobTitlesService);
  const repo = app.get(DataSource).getRepository(JobTitle);

  let created = 0;
  for (const sample of SAMPLES) {
    if (await repo.exists({ where: { code: sample.code } })) continue; // chạy lại nhiều lần không sao
    await service.create(sample, hr);
    created += 1;
  }
  console.log(`Seed xong: thêm ${created} chức danh, bỏ qua ${SAMPLES.length - created} chức danh đã có.`);
  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
