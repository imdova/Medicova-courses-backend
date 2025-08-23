import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { Course } from './entities/course.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { CoursePricingModule } from './course-pricing/course-pricing.module';
import { CourseTag } from './entities/course-tags.entity';
import { CourseSectionModule } from './course-section/course-section.module';
import { CoursePricing } from './course-pricing/entities/course-pricing.entity';
import { StudentCourseController } from './student-course.controller';
import { StudentCourseService } from './student-course.service';
import { Profile } from 'src/profile/entities/profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseTag, CoursePricing, Profile]),
    CoursePricingModule,
    CourseSectionModule,
  ],
  controllers: [CourseController, StudentCourseController],
  providers: [CourseService, RolesGuard, JwtService, StudentCourseService],
  exports: [CourseService], // export if used elsewhere
})
export class CourseModule {}
