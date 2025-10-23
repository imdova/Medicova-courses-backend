import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  IsNumber,
  IsInt,
  Min,
} from 'class-validator';

export class CreateCourseCategoryDto {
  @ApiProperty({
    description: 'Name of the category',
    maxLength: 255,
    example: 'Web Development',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Slug for SEO-friendly URLs',
    example: 'web-development',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    maxLength: 500,
    example: 'Courses and tutorials covering modern web development practices.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  // ✅ New priority field added
  @ApiPropertyOptional({
    description: 'Priority of the category (higher number = higher priority). Default is 0.',
    type: Number,
    default: 0,
    minimum: 0,
  })
  @IsNumber()
  @IsInt() // Ensures the number is an integer
  @Min(0) // Priority should typically be a non-negative number
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'Image URL for category thumbnail',
    example: 'https://cdn.example.com/images/web-dev.png',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  image?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID (if subcategory)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;
}
