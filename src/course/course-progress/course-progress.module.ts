import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseProgressService } from './course-progress.service';
import { CourseProgressController } from './course-progress.controller';
import { CourseProgress } from './entities/course-progress.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { CourseSectionItem } from 'src/course/course-section/entities/course-section-item.entity';
import { Quiz } from 'src/quiz/entities/quiz.entity';
import { QuizAttempt } from 'src/quiz/entities/quiz-attempts.entity';
import { Assignment } from 'src/assignment/entities/assignment.entity';
import { AssignmentSubmission } from 'src/assignment/entities/assignment-submission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CourseProgress,
      CourseStudent,
      CourseSectionItem,
      Quiz,
      QuizAttempt,
      Assignment,
      AssignmentSubmission,
    ]),
  ],
  controllers: [CourseProgressController],
  providers: [CourseProgressService],
  exports: [CourseProgressService],
})
export class CourseProgressModule {}
