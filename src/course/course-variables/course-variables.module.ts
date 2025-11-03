import { Module } from '@nestjs/common';
import { CourseVariablesService } from './course-variables.service';
import { CourseVariablesController } from './course-variables.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseVariable } from './entities/course-variable.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseVariable])
  ],
  controllers: [CourseVariablesController],
  providers: [CourseVariablesService],
})
export class CourseVariablesModule { }
