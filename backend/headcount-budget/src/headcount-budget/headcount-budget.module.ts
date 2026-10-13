import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../departments/department.entity';
import { Requisition } from '../requisitions/requisition.entity';
import { BudgetAuditLog } from './budget-audit-log.entity';
import { HeadcountBudgetController } from './headcount-budget.controller';
import { HeadcountBudget } from './headcount-budget.entity';
import { HeadcountBudgetService } from './headcount-budget.service';

@Module({
  imports: [TypeOrmModule.forFeature([HeadcountBudget, BudgetAuditLog, Department, Requisition])],
  controllers: [HeadcountBudgetController],
  providers: [HeadcountBudgetService],
  exports: [HeadcountBudgetService],
})
export class HeadcountBudgetModule {}
