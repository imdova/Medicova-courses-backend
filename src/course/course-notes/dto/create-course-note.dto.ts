import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCourseNoteDto {
    @ApiProperty({ description: 'Title of the note', example: 'Chapter 5 Summary' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @ApiProperty({
        description: 'Main content or body of the note',
        example: 'Important takeaways from this chapter include...',
    })
    @IsString()
    @IsNotEmpty()
    description: string;
}