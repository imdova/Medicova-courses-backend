import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizQuestionsController } from './quiz-questions.controller';
import { QuizQuestionsService } from './quiz-questions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Question, QuizQuestion])],
  controllers: [QuizController, QuizQuestionsController],
  providers: [QuizService, QuizQuestionsService],
})
export class QuizModule {}
