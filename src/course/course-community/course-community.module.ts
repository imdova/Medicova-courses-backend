import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseCommunityService } from './course-community.service';
import { CourseCommunityController } from './course-community.controller';
import { CourseCommunity } from './entities/course-community.entity';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseCommunity, Course, User])],
  controllers: [CourseCommunityController],
  providers: [CourseCommunityService],
  exports: [CourseCommunityService], // optional, if other modules will use it
})
export class CourseCommunityModule { }
