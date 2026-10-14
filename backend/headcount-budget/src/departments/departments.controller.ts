import { Body, Controller, Get, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { Roles } from '../common/decorators';
import { Role } from '../common/roles.enum';
import { Department } from './department.entity';

class CreateDepartmentDto {
  @ApiProperty({ example: 'IT' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code: string;

  @ApiProperty({ example: 'Phòng Công nghệ thông tin' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

/** Bản tối thiểu để có phòng ban gắn ngân sách (S2-04 sẽ làm đầy đủ). */
@ApiTags('Phòng ban (tối thiểu)')
@ApiBearerAuth()
@Controller('departments')
export class DepartmentsController {
  constructor(@InjectRepository(Department) private readonly repo: Repository<Department>) {}

  @Get()
  @Roles(Role.ADMIN, Role.HR_MANAGER, Role.RECRUITER, Role.HIRING_MANAGER, Role.APPROVER, Role.INTERVIEWER)
  list() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR_MANAGER)
  create(@Body() dto: CreateDepartmentDto) {
    return this.repo.save(this.repo.create(dto));
  }
}
