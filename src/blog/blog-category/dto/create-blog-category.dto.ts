// src/blog/dto/blog-category.dto.ts

import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, MaxLength, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBlogCategoryDto {
    @ApiProperty({ description: 'The display name of the blog category.', example: 'Technology' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiProperty({ description: 'A URL-friendly version of the name.', example: 'technology' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    slug: string;

    @ApiProperty({ description: 'Optional ID of the parent category (for subcategories).', required: false, example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsOptional()
    @IsUUID()
    parentId?: string;

    @ApiProperty({ description: 'Optional URL to an image representing the category.', required: false })
    @IsOptional()
    @IsString()
    image?: string;

    @ApiProperty({ description: 'Optional detailed description of the category.', required: false })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'Whether the category is active.', default: true, required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}