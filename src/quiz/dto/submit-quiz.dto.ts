import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, IsBoolean, ValidateNested, IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QuizAnswerDto {
  @ApiProperty({
    description: 'UUID of the question being answered',
    example: '6f1d7e4d-2c6b-4b1c-9c92-1a2e36d2af64',
  })
  @IsUUID()
  questionId: string;

  @ApiProperty({
    description: 'The answer text chosen by the student',
    example: 'Cairo',
  })
  @IsString()
  chosenOptionText: string;

  @ApiProperty({
    description: 'Whether the student marked this question as correct',
    example: true,
  })
  @IsBoolean()
  correct: boolean;
}

export class SubmitQuizDto {
  @ApiProperty({
    description: 'Array of answers for the quiz',
    type: [QuizAnswerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];

  @ApiProperty({
    description: 'Time taken by the student to solve the quiz (in minutes)',
    example: 8.75,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  timeTaken?: number;
}
