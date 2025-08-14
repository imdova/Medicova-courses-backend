import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { Quiz } from './quiz.entity';
import { Question } from './question.entity';

@Entity('quiz_questions')
export class QuizQuestion extends BasicEntity {
  @ManyToOne(() => Quiz, (quiz) => quiz.quizQuestions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @ManyToOne(() => Question, (question) => question.quizQuestions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @ApiProperty()
  @Column({ type: 'int' })
  order: number;
}
