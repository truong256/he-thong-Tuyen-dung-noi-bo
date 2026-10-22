import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../departments/department.entity';
import { HeadcountBudgetModule } from '../headcount-budget/headcount-budget.module';
import { Requisition } from './requisition.entity';
import { RequisitionsController } from './requisitions.controller';
import { RequisitionsService } from './requisitions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Requisition, Department]), HeadcountBudgetModule],
  controllers: [RequisitionsController],
  providers: [RequisitionsService],
})
export class RequisitionsModule {}
