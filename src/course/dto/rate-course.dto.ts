// dto/rate-course.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsString, IsEnum, IsArray } from 'class-validator';
import { CourseRatingStatus } from '../entities/course-rating.entity';

export class RateCourseDto {
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

    @ApiPropertyOptional({
        description: 'Optional array of image URLs',
        type: [String],
        example: ['https://example.com/image1.png', 'https://example.com/image2.png'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    images?: string[];

    @ApiPropertyOptional({
        description: 'Status of the rating',
        enum: CourseRatingStatus,
        example: CourseRatingStatus.DRAFT,
    })
    @IsOptional()
    @IsEnum(CourseRatingStatus)
    status?: CourseRatingStatus;
}
