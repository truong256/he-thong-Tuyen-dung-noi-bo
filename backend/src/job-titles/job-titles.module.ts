import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobTitle } from './job-title.entity';
import { JobTitlesController } from './job-titles.controller';
import { JobTitlesService } from './job-titles.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobTitle])],
  controllers: [JobTitlesController],
  providers: [JobTitlesService],
  // Module Offer / Yêu cầu tuyển dụng sau này inject service để gọi evaluateSalary().
  exports: [JobTitlesService],
})
export class JobTitlesModule {}
