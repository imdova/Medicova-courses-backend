import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsUUID,
  IsNumber,
  IsInt,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsIn,
} from 'class-validator';


// 🟢 NEW: Define the DTO for a single FAQ item
export class FaqItemDto {
  @ApiProperty({ description: 'The question text', example: 'What is NestJS?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: 'The answer text', example: 'It is a framework for building efficient, scalable Node.js server-side applications.' })
  @IsString()
  @IsNotEmpty()
  answer: string;
}

// 🟢 NEW: DTO for SEO Meta Information
export class SeoMetaDto {
  @ApiPropertyOptional({
    description: 'SEO Meta Title (Recommended: 25-40 characters)',
    maxLength: 60,
    example: 'Web Development Courses | Start Your Tech Career',
  })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'SEO Meta Description (Recommended: 150-160 characters)',
    maxLength: 170,
    example: 'Browse our comprehensive web development courses covering HTML, CSS, JavaScript, and Node.js frameworks.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(170)
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'SEO Keywords (simple array)',
    type: [String],
    example: ['web development', 'frontend', 'backend', 'fullstack'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  metaKeywords?: string[];
}

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

  // ✅ New isActive field added
  @ApiPropertyOptional({
    description: 'Whether the category is visible and active. Defaults to true.',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Image URL for category thumbnail',
    example: 'https://cdn.example.com/images/web-dev.png',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  image?: string;

  // 🟢 NEW FIELD: SVG Icon
  @ApiPropertyOptional({
    description: 'SVG icon content or URL for the category. Corresponds to the "Upload SVG" field.',
    type: String,
    example: 'https://cdn.example.com/icons/web-dev-icon.svg',
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  svgIcon?: string;

  @ApiPropertyOptional({
    description: 'Parent category ID (if subcategory)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Frequently Asked Questions',
    type: [FaqItemDto], // Specify the nested DTO array for Swagger
    example: [{ question: 'Q1', answer: 'A1' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  @IsOptional()
  faqs?: FaqItemDto[];

  @ApiPropertyOptional({
    description: 'SEO Meta Information (Title, Description, Keywords)',
    type: SeoMetaDto,
  })
  @IsOptional()
  @ValidateNested() // Validate the inner object
  @Type(() => SeoMetaDto) // Transform the incoming data to the DTO class
  seoMeta?: SeoMetaDto;

  @ApiPropertyOptional({
    description: 'A short, catchy headline for the category',
    maxLength: 500,
    example: 'Master Frontend & Backend Development',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  categoryHeadline?: string;

  @ApiPropertyOptional({
    description: 'Detailed description with rich formatting (HTML/Markdown content)',
    type: String,
  })
  @IsString()
  @IsOptional()
  richDescription?: string;
}
