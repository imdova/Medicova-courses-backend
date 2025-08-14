import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { QuizQuestion } from './quiz-question.entity';

export enum QuestionType {
  MCQ = 'mcq',
  SCQ = 'scq',
}

@Entity('questions')
export class Question extends BasicEntity {
  //   @ApiProperty()
  //   @Column({ type: 'uuid' })
  //   created_by: string;

  @ApiProperty({ enum: QuestionType })
  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.SCQ })
  type: QuestionType;

  @ApiProperty({
    description: 'The actual question text shown to the user',
    example: 'What is the capital of France?',
  })
  @Column({ type: 'text' })
  text: string;

  @ApiProperty({
    description: 'Optional image for the question',
    example: 'https://example.com/images/question1.png',
    required: false,
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url?: string;

  @ApiProperty()
  @Column({ type: 'float', default: 1 })
  points: number;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  explanation: string;

  @ApiProperty({
    description: 'Array of possible answers in JSON format',
    example: [{ text: 'Answer 1', correct: true, imageUrl: 'image1.jpg' }],
  })
  @Column({ type: 'json', nullable: true })
  answers: any;

  @OneToMany(() => QuizQuestion, (qq) => qq.question)
  quizQuestions: QuizQuestion[];
}
