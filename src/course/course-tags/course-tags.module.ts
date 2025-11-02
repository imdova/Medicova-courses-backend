import { Module } from '@nestjs/common';
import { CourseTagsService } from './course-tags.service';
import { CourseTagsController } from './course-tags.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseTag } from './entities/course-tags.entity';
import { Course } from '../entities/course.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseTag, Course])
  ],
  controllers: [CourseTagsController],
  providers: [CourseTagsService],
})
export class CourseTagsModule { }
