import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSectionService } from './course-section.service';
import { CourseSectionController } from './course-section.controller';
import { CourseSection } from './entities/course-section.entity';
import { CourseSectionItem } from './entities/course-section-item.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { CourseModule } from '../course.module';
import { CourseSectionItemController } from './course-section-item.controller';
import { CourseSectionItemService } from './course-section-item.service';
import { Lecture } from './entities/lecture.entity';
import { Quiz } from 'src/quiz/entities/quiz.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourseSection, CourseSectionItem, Lecture, Quiz]),
    forwardRef(() => CourseModule),
  ],
  controllers: [CourseSectionController, CourseSectionItemController],
  providers: [
    CourseSectionService,
    RolesGuard,
    JwtService,
    CourseSectionItemService,
  ],
  exports: [CourseSectionService],
})
export class CourseSectionModule {}
