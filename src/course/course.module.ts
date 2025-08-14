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

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseTag, CoursePricing]),
    CoursePricingModule,
    CourseSectionModule,
  ],
  controllers: [CourseController],
  providers: [CourseService, RolesGuard, JwtService],
  exports: [CourseService], // export if used elsewhere
})
export class CourseModule {}
