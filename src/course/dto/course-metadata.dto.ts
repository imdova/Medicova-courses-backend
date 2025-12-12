import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulletSectionDto {
  @ApiPropertyOptional({
    description: 'Introductory text before bullet points',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: 'Bullet point items', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  items?: string[];
}

export class FaqItemDto {
  @ApiPropertyOptional({ description: 'FAQ question' })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({ description: 'FAQ answer' })
  @IsOptional()
  @IsString()
  answer?: string;
}

export class CourseSeoDto {
  @ApiPropertyOptional({
    description: 'Meta Title for SEO (e.g., used for the <title> tag)',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated list of keywords for SEO',
    type: [String],
    example: ['nestjs', 'backend', 'typescript'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Meta Description for SEO (e.g., used in search snippets)',
    maxLength: 160,
  })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({
    description: 'URL or path for the SEO/Open Graph image (Meta Image)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  metaImage?: string;

  // --------------------------------------------------------
  //               NEW OG (OPEN GRAPH) FIELDS
  // --------------------------------------------------------

  @ApiPropertyOptional({
    description: 'Open Graph Title (used for social sharing)',
  })
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiPropertyOptional({
    description: 'Open Graph Description (used for social sharing)',
  })
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional({
    description: 'Open Graph Image URL (used for social preview)',
    example: 'https://example.com/og-image.jpg',
  })
  @IsOptional()
  @IsString()
  ogImage?: string;

  // --------------------------------------------------------
  //               NEW TWITTER CARD FIELDS
  // --------------------------------------------------------

  @ApiPropertyOptional({
    description: 'Twitter Card Title',
  })
  @IsOptional()
  @IsString()
  twitterTitle?: string;

  @ApiPropertyOptional({
    description: 'Twitter Card Description',
  })
  @IsOptional()
  @IsString()
  twitterDescription?: string;

  @ApiPropertyOptional({
    description: 'Twitter Card Image URL',
    example: 'https://example.com/twitter-image.jpg',
  })
  @IsOptional()
  @IsString()
  twitterImage?: string;
}

export class CourseMetadataDto {
  @ApiPropertyOptional({
    description: 'Detailed course overview (rich text supported)',
    example: '<p>This course teaches you the basics of NestJS...</p>',
  })
  @IsOptional()
  @IsString()
  courseOverview?: string;

  @ApiPropertyOptional({
    description: 'Who can attend this course',
    type: BulletSectionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulletSectionDto)
  whoCanAttend?: BulletSectionDto;

  @ApiPropertyOptional({
    description: 'What will you learn',
    type: BulletSectionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulletSectionDto)
  whatWillYouLearn?: BulletSectionDto;

  @ApiPropertyOptional({ description: 'List of FAQs', type: [FaqItemDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FaqItemDto)
  faqs?: FaqItemDto[];

  @ApiPropertyOptional({
    description: 'Container for all SEO-related metadata',
    type: CourseSeoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseSeoDto)
  seo?: CourseSeoDto;
}
