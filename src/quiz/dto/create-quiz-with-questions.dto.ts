import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuizDto } from './create-quiz.dto';
import { CreateQuestionDto } from './create-question.dto';

export class CreateQuizWithQuestionsDto {
    @ApiProperty({ type: CreateQuizDto })
    @ValidateNested()
    @Type(() => CreateQuizDto)
    quiz: CreateQuizDto;

    @ApiProperty({
        type: [CreateQuestionDto],
        description: 'List of questions to attach to quiz',
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateQuestionDto)
    questions: CreateQuestionDto[];
}
