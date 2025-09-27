import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested, IsArray, IsOptional, IsString, IsNumber, IsBoolean, IsEnum, IsUrl, Min, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateQuizDto } from './update-quiz.dto';
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

class QuestionUpdateDto {
    @ApiPropertyOptional({
        description: 'Question ID. Required for update/delete operations, omit for new questions.',
        example: '15f7bedc-aa1a-47ad-9ea9-1d581ea00878'
    })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiPropertyOptional({
        description: 'Type of the question. Required for new questions and when updating question type.',
        enum: QuestionType,
        example: QuestionType.MCQ
    })
    @IsEnum(QuestionType)
    @ValidateIf((o) => !o.delete && !o.id) // Required for new questions (no id)
    @IsOptional()
    type?: QuestionType;

    @ApiPropertyOptional({
        description: 'The question text. Required for new questions.',
        example: 'What is the capital of France?',
    })
    @IsString()
    @ValidateIf((o) => !o.delete && !o.id) // Required for new questions (no id)
    @IsOptional()
    text?: string;

    @ApiPropertyOptional({
        description: 'Points for this question. Required for new questions.',
        minimum: 0,
        example: 1
    })
    @IsNumber()
    @Min(0)
    @ValidateIf((o) => !o.delete && !o.id) // Required for new questions (no id)
    @IsOptional()
    points?: number;

    @ApiPropertyOptional({
        description: 'Explanation shown after answering',
        example: 'Paris is the capital city of France.'
    })
    @IsString()
    @ValidateIf((o) => !o.delete)
    @IsOptional()
    explanation?: string;

    @ApiPropertyOptional({
        description: 'Optional image URL for the question',
        example: 'https://example.com/question-image.png',
    })
    @IsUrl()
    @ValidateIf((o) => !o.delete)
    @IsOptional()
    image_url?: string;

    @ApiPropertyOptional({
        description: 'Answer options. Required for MCQ/SCQ questions.',
        type: [AnswerOptionDto],
        example: [
            { text: 'Paris', correct: true },
            { text: 'London', correct: false },
            { text: 'Berlin', correct: false }
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnswerOptionDto)
    @ValidateIf((o) => {
        // Required for new MCQ/SCQ questions, optional for updates unless changing answers
        if (o.delete) return false;
        if (!o.id && (o.type === QuestionType.MCQ || o.type === QuestionType.SCQ)) return true;
        return false;
    })
    @IsOptional()
    answers?: AnswerOptionDto[];

    @ApiPropertyOptional({
        description: 'Display order of the question in the quiz',
        minimum: 1,
        example: 1
    })
    @IsNumber()
    @Min(1)
    @IsOptional()
    order?: number;

    @ApiPropertyOptional({
        description: 'Set to true to delete this question. Requires id to be provided.',
        default: false,
        example: false
    })
    @IsBoolean()
    @IsOptional()
    delete?: boolean;
}

export class UpdateQuizWithQuestionsDto {
    @ApiPropertyOptional({
        type: UpdateQuizDto,
        description: 'Quiz properties to update'
    })
    @ValidateNested()
    @Type(() => UpdateQuizDto)
    @IsOptional()
    quiz?: UpdateQuizDto;

    @ApiPropertyOptional({
        type: [QuestionUpdateDto],
        description: `Questions to create, update, delete, or reorder. Examples:
    
    UPDATE EXISTING: { "id": "uuid", "text": "New text", "points": 5 }
    CREATE NEW: { "type": "mcq", "text": "Question?", "points": 2, "answers": [...] }
    DELETE: { "id": "uuid", "delete": true }
    REORDER: { "id": "uuid", "order": 3 }
    COMBINE: Mix any of the above in a single request`
    })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => QuestionUpdateDto)
    questions?: QuestionUpdateDto[];
}