import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateAcademyKeywordDto {
    @ApiProperty({ description: 'Keyword name', example: 'Data Science' })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Description or context for the keyword',
        example: 'For academies offering data analysis and machine learning courses',
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;
}
