import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import {
  AnswerTimeType,
  AttemptMode,
  Availability,
  QuizStatus,
} from '../entities/quiz.entity';

export class CreateQuizDto {
  //   @ApiProperty({
  //     description: 'ID of the teacher creating the quiz',
  //     format: 'uuid',
  //     example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  //   })
  //   @IsUUID()
  //   created_by: string;

  @ApiProperty({
    description: 'Title of the quiz',
    maxLength: 255,
    example: 'Final Exam - Physics 101',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Instructions for the quiz',
    example: 'Read each question carefully and select the best answer.',
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({
    description: 'Is the quiz standalone?',
    default: false,
    example: true,
  })
  @IsBoolean()
  standalone: boolean;

  @ApiProperty({
    description: 'Randomize order of questions',
    default: false,
    example: true,
  })
  @IsBoolean()
  randomize_questions: boolean;

  @ApiProperty({
    description: 'Randomize order of answers',
    default: false,
    example: false,
  })
  @IsBoolean()
  randomize_answers: boolean;

  @ApiProperty({
    description: 'Immediate feedback after each question',
    default: false,
    example: true,
  })
  @IsBoolean()
  immediate_feedback: boolean;

  @ApiProperty({
    description: 'Send feedback via email after completion',
    default: false,
    example: false,
  })
  @IsBoolean()
  feedback_by_email: boolean;

  @ApiProperty({
    description: 'Passing score for the quiz',
    example: 70,
  })
  @IsInt()
  @Min(0)
  passing_score: number;

  @ApiPropertyOptional({
    description: 'Allowed retakes',
    default: 0,
    example: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  retakes?: number;

  @ApiProperty({
    description: 'Availability type',
    enum: Availability,
    default: Availability.ALWAYS,
    example: Availability.TIME_BOUND,
  })
  @IsEnum(Availability)
  availability: Availability;

  @ApiPropertyOptional({
    description: 'Start date (if scheduled)',
    example: '2025-09-01T09:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start_date?: Date;

  @ApiPropertyOptional({
    description: 'End date (if scheduled)',
    example: '2025-09-10T17:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  end_date?: Date;

  @ApiPropertyOptional({
    description: 'Grace period in minutes after start',
    example: 15,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  late_time_minutes?: number;

  @ApiProperty({
    description: 'Allowed attempt mode',
    enum: AttemptMode,
    default: AttemptMode.SINGLE,
    example: AttemptMode.MULTIPLE,
  })
  @IsEnum(AttemptMode)
  attempt_mode: AttemptMode;

  @ApiProperty({
    description: 'Answer time restriction type',
    enum: AnswerTimeType,
    default: AnswerTimeType.FLEXIBLE,
    example: AnswerTimeType.QUIZ_TIME,
  })
  @IsEnum(AnswerTimeType)
  answer_time_type: AnswerTimeType;

  @ApiPropertyOptional({
    description: 'Allowed time in minutes (depends on answer_time_type)',
    example: 45,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  answer_time?: number;

  @ApiProperty({
    description: 'Status of the quiz',
    enum: QuizStatus,
    default: QuizStatus.DRAFT,
    example: QuizStatus.PUBLISHED,
  })
  @IsEnum(QuizStatus)
  status: QuizStatus;
}
