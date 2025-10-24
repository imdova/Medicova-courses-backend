import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitIdentityDto {
    @ApiProperty({
        description: 'Array of file URLs (or paths) for the uploaded identity documents.',
        type: [String],
        example: ['https://cdn.example.com/doc1.jpg', 'https://cdn.example.com/doc2.pdf'],
    })
    @IsArray()
    @IsString({ each: true })
    fileUrls: string[];

    @ApiPropertyOptional({ description: 'Optional notes or comments from the user regarding the submission.' })
    @IsOptional()
    @IsString()
    notes?: string;
}