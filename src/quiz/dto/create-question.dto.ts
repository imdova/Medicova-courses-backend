import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionType } from '../entities/question.entity';

class AnswerOptionDto {
  @ApiProperty({ description: 'Answer text' })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Is this the correct answer?' })
  @IsBoolean()
  correct: boolean;

  @ApiPropertyOptional({
    description: 'Optional image for the answer',
    example: 'https://example.com/image.png',
  })
  @IsOptional()
  @IsUrl()
  image_url?: string;
}

export class CreateQuestionDto {
  //   @ApiProperty({
  //     description: 'ID of the teacher creating the question',
  //     format: 'uuid',
  //   })
  //   @IsUUID()
  //   created_by: string;

  @ApiProperty({ description: 'Type of the question', enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiProperty({
    description: 'The actual question text shown to the user',
    example: 'What is the capital of France?',
  })
  @IsString()
  text: string;

  @ApiProperty({ description: 'Points for this question', default: 1 })
  @IsNumber()
  @Min(0)
  points: number;

  @ApiPropertyOptional({ description: 'Explanation shown after answering' })
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Optional image for the question',
    example: 'https://example.com/image.png',
  })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @ApiProperty({
    description: 'List of possible answers',
    type: [AnswerOptionDto],
    example: [
      { text: 'Option A', correct: false, image_url: 'https://example.com/image.png' },
      { text: 'Option B', correct: true, image_url: 'https://example.com/image.png' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  answers: AnswerOptionDto[];

  @ApiPropertyOptional({
    description: 'Order of the question in the quiz (if attaching to a quiz)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;
}
