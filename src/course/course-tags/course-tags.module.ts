import { Module } from '@nestjs/common';
import { CourseTagsService } from './course-tags.service';
import { CourseTagsController } from './course-tags.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseTag } from './entities/course-tags.entity';
import { Course } from '../entities/course.entity';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseTag, Course]),
    // Configure Multer for file uploads (10MB limit)
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  ],
  controllers: [CourseTagsController],
  providers: [CourseTagsService],
})
export class CourseTagsModule { }
