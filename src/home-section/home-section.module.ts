import { Module } from '@nestjs/common';
import { HomeSectionService } from './home-section.service';
import { HomeSectionController } from './home-section.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomeSection } from './entities/home-section.entity';
import { Course } from 'src/course/entities/course.entity';
import { CourseCategory } from 'src/course/course-category/entities/course-category.entity';
import { Bundle } from 'src/bundle/entities/bundle.entity';
import { BundlePricing } from 'src/bundle/entities/bundle-pricing.entity';
import { CourseBundle } from 'src/bundle/entities/course-bundle.entity';
import { Academy } from 'src/academy/entities/academy.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HomeSection, Course, CourseCategory, Bundle, BundlePricing, CourseBundle, Academy, User])],
  controllers: [HomeSectionController],
  providers: [HomeSectionService],
})
export class HomeSectionModule { }
