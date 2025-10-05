// dto/rate-course.dto.ts
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class RateProfileDto {
    @ApiProperty({ description: 'Rating from 1 to 5', example: 4 })
    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;

    @ApiPropertyOptional({
        description: 'Optional review message',
        example: 'Great instructor!',
    })
    @IsOptional()
    @IsString()
    review?: string;
}
