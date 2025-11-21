import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    MaxLength,
    IsBoolean,
    IsOptional,
    IsHexColor,
} from 'class-validator';

export class CreateBlogTagDto {

    @ApiProperty({
        description: 'Tag Name (e.g., Advanced, Beginner Friendly)',
        example: 'Advanced',
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string; // Required (*)

    @ApiProperty({
        description: 'Slug for SEO-friendly URLs',
        example: 'advanced',
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    slug: string; // Required (*)

    @ApiPropertyOptional({
        description: 'Brief description of this tag',
        maxLength: 255,
    })
    @IsString()
    @IsOptional()
    @MaxLength(255)
    description?: string;

    @ApiProperty({
        description: 'Color associated with the tag (Hex code, e.g., #007bff)',
        example: '#5cb85c',
    })
    @IsString()
    @IsNotEmpty()
    @IsHexColor() // Ensures the value is a valid Hex color code
    color: string; // Required (*)

    @ApiPropertyOptional({
        description: 'Whether the tag is active (visible). Defaults to true.',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}