import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from '../../common/entities/basic.entity';
import { QuizQuestion } from './quiz-question.entity';
import { Academy } from 'src/academy/entities/academy.entity';
import { User } from 'src/user/entities/user.entity';

export enum QuizStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum Availability {
  ALWAYS = 'permanent',
  TIME_BOUND = 'time_bound',
}

export enum AttemptMode {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  UNLIMITED = 'unlimited',
}

export enum AnswerTimeType {
  FLEXIBLE = 'flexible',
  QUIZ_TIME = 'quiz_time',
  QUESTION_TIME = 'question_time',
}

@Entity('quizzes')
export class Quiz extends BasicEntity {
  @ManyToOne(() => User, { eager: false, nullable: false })
  @JoinColumn({ name: 'created_by' })
  instructor: User;

  @ApiProperty({
    description: 'User ID of the teacher/admin who created the quiz',
    format: 'uuid',
  })
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ApiProperty({ enum: QuizStatus })
  @Column({ type: 'enum', enum: QuizStatus, default: QuizStatus.DRAFT })
  status: QuizStatus;

  @ApiProperty()
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text', nullable: true })
  instructions: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  standalone: boolean;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  randomize_questions: boolean;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  randomize_answers: boolean;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  immediate_feedback: boolean;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  feedback_by_email: boolean;

  @ApiProperty()
  @Column({ type: 'int', nullable: true })
  passing_score: number;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  retakes: number;

  @ApiProperty({ enum: Availability })
  @Column({ type: 'enum', enum: Availability, default: Availability.ALWAYS })
  availability: Availability;

  @ApiProperty()
  @Column({ type: 'date', nullable: true })
  start_date: Date;

  @ApiProperty()
  @Column({ type: 'date', nullable: true })
  end_date: Date;

  @ApiProperty()
  @Column({ type: 'int', nullable: true })
  late_time_minutes: number;

  @ApiProperty({ enum: AttemptMode })
  @Column({ type: 'enum', enum: AttemptMode, default: AttemptMode.SINGLE })
  attempt_mode: AttemptMode;

  @ApiProperty({ enum: AnswerTimeType })
  @Column({
    type: 'enum',
    enum: AnswerTimeType,
    default: AnswerTimeType.FLEXIBLE,
  })
  answer_time_type: AnswerTimeType;

  @ApiProperty()
  @Column({ type: 'int', nullable: true })
  answer_time: number;

  @OneToMany(() => QuizQuestion, (qq) => qq.quiz, { cascade: ['remove'] })
  quizQuestions: QuizQuestion[];

  @ManyToOne(() => Academy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academy_id' })
  academy?: Academy;
}
