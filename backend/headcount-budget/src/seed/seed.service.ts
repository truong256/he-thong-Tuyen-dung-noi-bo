import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../common/roles.enum';
import { Department } from '../departments/department.entity';
import { HeadcountBudget } from '../headcount-budget/headcount-budget.entity';
import { User } from '../users/user.entity';

/** Dữ liệu demo: chạy khi DB còn trống (tắt bằng SEED=false). */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly log = new Logger('Seed');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Department) private readonly depts: Repository<Department>,
    @InjectRepository(HeadcountBudget) private readonly budgets: Repository<HeadcountBudget>,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.SEED === 'false') return;
    if ((await this.users.count()) > 0) return;

    const it = await this.depts.save(this.depts.create({ code: 'IT', name: 'Phòng Công nghệ thông tin' }));
    const mkt = await this.depts.save(this.depts.create({ code: 'MKT', name: 'Phòng Marketing' }));

    const hash = await bcrypt.hash(process.env.DEMO_PASSWORD ?? 'Passw0rd!', 10);
    const mk = (email: string, fullName: string, roles: Role[], departmentId: number | null) =>
      this.users.save(this.users.create({ email, fullName, roles, departmentId, passwordHash: hash }));

    const hr = await mk('hr.manager@company.vn', 'Trưởng phòng Nhân sự', [Role.HR_MANAGER], null);
    await mk('admin@company.vn', 'Quản trị hệ thống', [Role.ADMIN], null);
    await mk('approver@company.vn', 'Người duyệt', [Role.APPROVER], null);
    await mk('recruiter@company.vn', 'Nhân viên tuyển dụng', [Role.RECRUITER], null);
    await mk('hm.it@company.vn', 'Trưởng phòng IT', [Role.HIRING_MANAGER], it.id);
    await mk('hm.mkt@company.vn', 'Trưởng phòng Marketing', [Role.HIRING_MANAGER], mkt.id);
    await mk('interviewer@company.vn', 'Người phỏng vấn', [Role.INTERVIEWER], it.id);

    const year = new Date().getFullYear();
    await this.budgets.save(
      this.budgets.create({
        departmentId: it.id,
        year,
        headcountQuota: 5,
        salaryBudgetVnd: 1_800_000_000,
        createdBy: hr.id,
        updatedBy: hr.id,
      }),
    );
    this.log.log(`Đã tạo dữ liệu demo (mật khẩu: ${process.env.DEMO_PASSWORD ?? 'Passw0rd!'}), ngân sách IT năm ${year}: 5 headcount.`);
  }
}
