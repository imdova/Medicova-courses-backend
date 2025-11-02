import { forwardRef, Module } from '@nestjs/common';
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
import { CourseStudent } from './entities/course-student.entity';
import { CourseProgressModule } from './course-progress/course-progress.module';
import { CourseSectionItem } from './course-section/entities/course-section-item.entity';
import { CourseCategory } from 'src/course/course-category/entities/course-category.entity';
import { CourseCategoryModule } from './course-category/course-category.module';
import { PaymentModule } from 'src/payment/payment.module';
import { CourseRating } from './entities/course-rating.entity';
import { CourseCommunityModule } from './course-community/course-community.module';
import { CourseNotesModule } from './course-notes/course-notes.module';
import { CourseProgress } from './course-progress/entities/course-progress.entity';
import { CourseFavorite } from './entities/course-favorite.entity';
import { AcademyInstructor } from 'src/academy/entities/academy-instructors.entity';
import { User } from 'src/user/entities/user.entity';
import { CourseTagsModule } from './course-tags/course-tags.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      CourseTag,
      CoursePricing,
      Profile,
      CourseStudent,
      CourseSectionItem,
      CourseCategory,
      CourseRating,
      CourseProgress,
      CourseFavorite,
      AcademyInstructor,
      User
    ]),
    CoursePricingModule,
    CourseSectionModule,
    CourseProgressModule,
    CourseCategoryModule,
    forwardRef(() => PaymentModule),
    CourseCommunityModule,
    CourseNotesModule,
    CourseTagsModule,
  ],
  controllers: [CourseController, StudentCourseController],
  providers: [CourseService, RolesGuard, JwtService, StudentCourseService],
  exports: [CourseService], // export if used elsewhere
})
export class CourseModule { }
