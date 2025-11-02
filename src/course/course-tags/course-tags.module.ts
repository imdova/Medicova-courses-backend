import { Module } from '@nestjs/common';
import { CourseTagsService } from './course-tags.service';
import { CourseTagsController } from './course-tags.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseTag } from '../entities/course-tags.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseTag])
  ],
  controllers: [CourseTagsController],
  providers: [CourseTagsService],
})
export class CourseTagsModule { }
