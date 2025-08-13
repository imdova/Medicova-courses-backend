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
}
