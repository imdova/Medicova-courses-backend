import { Entity, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from '../../common/entities/basic.entity';
import { Quiz } from './quiz.entity';
import { Question } from './question.entity';

@Entity('quiz_questions')
@Unique(['quiz', 'question'])
export class QuizQuestion extends BasicEntity {
  @ManyToOne(() => Quiz, (quiz) => quiz.quizQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @ManyToOne(() => Question, (question) => question.quizQuestions, {
    cascade: ['remove'], // ensure removing quizQuestion removes its question
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ApiProperty()
  @Column({ type: 'int' })
  order: number;
}
