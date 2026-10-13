import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../../src/common/roles.enum';
import { AuthUser } from '../../src/common/auth.types';
import { Department } from '../../src/departments/department.entity';
import { HeadcountBudgetModule } from '../../src/headcount-budget/headcount-budget.module';
import { Requisition, RequisitionStatus } from '../../src/requisitions/requisition.entity';
import { RequisitionsModule } from '../../src/requisitions/requisitions.module';
import { User } from '../../src/users/user.entity';

/** Module dùng DB sql.js trong bộ nhớ: mỗi test suite một DB sạch, không cần cài gì. */
export async function createServiceTestingModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({ type: 'sqljs', autoLoadEntities: true, synchronize: true }),
      TypeOrmModule.forFeature([User, Department]),
      HeadcountBudgetModule,
      RequisitionsModule,
    ],
  }).compile();
}

export interface Fixture {
  deptIt: Department;
  deptMkt: Department;
  deptOld: Department;
  hr: AuthUser;
  admin: AuthUser;
  approver: AuthUser;
  hmIt: AuthUser;
  hmMkt: AuthUser;
}

export async function seedFixture(mod: TestingModule): Promise<Fixture> {
  const depts = mod.get<Repository<Department>>(getRepositoryToken(Department));
  const users = mod.get<Repository<User>>(getRepositoryToken(User));
  const hash = await bcrypt.hash('x', 4);

  const deptIt = await depts.save(depts.create({ code: 'IT', name: 'IT' }));
  const deptMkt = await depts.save(depts.create({ code: 'MKT', name: 'Marketing' }));
  const deptOld = await depts.save(depts.create({ code: 'OLD', name: 'Cũ', active: false }));

  const mk = async (email: string, roles: Role[], departmentId: number | null): Promise<AuthUser> => {
    const u = await users.save(users.create({ email, fullName: email, roles, departmentId, passwordHash: hash }));
    return { id: u.id, email: u.email, roles: u.roles, departmentId: u.departmentId };
  };
  return {
    deptIt,
    deptMkt,
    deptOld,
    hr: await mk('hr@t.vn', [Role.HR_MANAGER], null),
    admin: await mk('admin@t.vn', [Role.ADMIN], null),
    approver: await mk('approver@t.vn', [Role.APPROVER], null),
    hmIt: await mk('hm.it@t.vn', [Role.HIRING_MANAGER], deptIt.id),
    hmMkt: await mk('hm.mkt@t.vn', [Role.HIRING_MANAGER], deptMkt.id),
  };
}

/** Chèn nhanh một yêu cầu với trạng thái bất kỳ để dựng dữ liệu cho test. */
export async function insertRequisition(
  mod: TestingModule,
  p: {
    departmentId: number;
    year?: number;
    quantity: number;
    salary?: number;
    status: RequisitionStatus;
    createdBy: number;
  },
): Promise<Requisition> {
  const ds = mod.get(DataSource);
  const repo = ds.getRepository(Requisition);
  return repo.save(
    repo.create({
      title: 'Test',
      departmentId: p.departmentId,
      budgetYear: p.year ?? 2026,
      quantity: p.quantity,
      proposedSalaryVnd: p.salary ?? 20_000_000,
      status: p.status,
      createdBy: p.createdBy,
    }),
  );
}
