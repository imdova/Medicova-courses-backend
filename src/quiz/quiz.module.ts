import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizQuestionsController } from './quiz-questions.controller';
import { QuizQuestionsService } from './quiz-questions.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { QuizAttempt } from './entities/quiz-attempts.entity';
import { CourseProgress } from 'src/course/course-progress/entities/course-progress.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
//import { CourseQuizController } from './course-quiz.controller';
import { CourseSectionItem } from 'src/course/course-section/entities/course-section-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Quiz,
      Question,
      QuizQuestion,
      QuizAttempt,
      CourseProgress,
      CourseStudent,
      CourseSectionItem,
    ]),
  ],
  controllers: [QuizController, QuizQuestionsController],
  providers: [QuizService, QuizQuestionsService, RolesGuard, JwtService],
})
export class QuizModule {}
