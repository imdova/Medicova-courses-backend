import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseCategory } from './entities/course-category.entity';
import { CourseCategoryService } from './course-category.service';
import { CourseCategoryController } from './course-category.controller';
import { Course } from '../entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseCategory, Course])],
  controllers: [CourseCategoryController],
  providers: [CourseCategoryService],
  exports: [CourseCategoryService], // 👈 export if other modules need CategoryService
})
export class CourseCategoryModule { }
