import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdminRateCourseDto {
    @ApiProperty({
        description: 'UUID of the course being rated.',
        example: 'b1c2d3e4-f5g6-7890-1234-567890abcdef'
    })
    @IsUUID()
    courseId: string; // 👈 NEW: Course ID moved here

    @ApiProperty({
        description: 'UUID of the student to whom the rating belongs.',
        example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef'
    })
    @IsUUID()
    studentId: string;

    @ApiProperty({ description: 'Rating from 1 to 5', example: 4 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({
        description: 'Optional review message',
        example: 'This course was very helpful!',
    })
    @IsOptional()
    @IsString()
    review?: string;
}