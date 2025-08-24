import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsArray,
  IsUUID,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CurriculumType } from 'src/course/course-section/entities/course-section-item.entity';

/**
 * Quiz Answer
 */
export class QuizAnswerDto {
  @ApiProperty({
    description: 'UUID of the question being answered',
    example: '6f1d7e4d-2c6b-4b1c-9c92-1a2e36d2af64',
  })
  @IsUUID()
  questionId: string;

  @ApiProperty({
    description: 'Whether the student marked this question as correct',
    example: true,
  })
  @IsBoolean()
  correct: boolean;
}

/**
 * Assignment Submission
 */
export class AssignmentSubmissionDto {
  @ApiPropertyOptional({
    description: 'Optional notes or description for the submission',
    example: 'Here is my essay submission.',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'URL of the uploaded assignment file',
    example: '/uploads/my-assignment.pdf',
  })
  @IsString()
  file_url: string;
}

/**
 * Generic Course Item Submission DTO
 */
export class SubmitCourseItemDto {
  @ApiPropertyOptional({
    description: 'Quiz answers (for QUIZ type only)',
    type: [QuizAnswerDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers?: QuizAnswerDto[];

  @ApiPropertyOptional({
    description: 'Assignment submission details (for ASSIGNMENT type only)',
    type: () => AssignmentSubmissionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssignmentSubmissionDto)
  assignmentSubmission?: AssignmentSubmissionDto;
}
