import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './common/guards';
import { buildTypeOrmOptions } from './database/database.config';
import { DepartmentsModule } from './departments/departments.module';
import { HeadcountBudgetModule } from './headcount-budget/headcount-budget.module';
import { RequisitionsModule } from './requisitions/requisitions.module';
import { SeedService } from './seed/seed.service';
import { User } from './users/user.entity';
import { Department } from './departments/department.entity';
import { HeadcountBudget } from './headcount-budget/headcount-budget.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    TypeOrmModule.forFeature([User, Department, HeadcountBudget]),
    AuthModule,
    DepartmentsModule,
    HeadcountBudgetModule,
    RequisitionsModule,
  ],
  providers: [
    SeedService,
    // Thứ tự quan trọng: xác thực trước, phân quyền sau. Mặc định từ chối.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
