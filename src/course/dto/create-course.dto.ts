import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
  IsUUID,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CourseType,
  CourseStatus,
  LectureFrequencyCount,
  DurationUnit,
  CourseLevel,
  ProgramType,
} from '../entities/course.entity';
import { CourseMetadataDto } from './course-metadata.dto';
import { Type } from 'class-transformer';
import { CreateCoursePricingDto } from '../course-pricing/dto/create-course-pricing.dto';

export class CreateCourseDto {
  @ApiProperty({
    enum: CourseType,
    description: 'Type of the course (recorded, online, offline, hybrid)',
    example: CourseType.RECORDED,
  })
  @IsEnum(CourseType)
  type: CourseType;

  @ApiProperty({
    description: 'Slug for SEO-friendly URLs',
    example: 'web-development',
  })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional({
    description: 'Difficulty level of the course',
    enum: CourseLevel,
    example: CourseLevel.BEGINNER,
  })
  @IsOptional()
  @IsEnum(CourseLevel)
  level: CourseLevel;

  @ApiPropertyOptional({
    description: 'Tags for the course (used for categorization and search)',
    type: [String],
    example: ['JavaScript', 'Backend', 'NestJS'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    enum: CourseStatus,
    description: 'Status of the course',
    default: CourseStatus.DRAFT,
    example: CourseStatus.PUBLISHED,
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiProperty({
    description: 'Whether the course is currently active',
    example: true,
  })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({
    description: 'Main category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  category: string;

  @ApiPropertyOptional({
    description: 'Optional subcategory ID',
    example: '770e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  subcategory?: string;

  @ApiProperty({
    description: 'Name of the course',
    maxLength: 255,
    example: 'NestJS for Beginners',
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Start date of the course (YYYY-MM-DD)',
    type: String,
    format: 'date',
    example: '2025-09-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date of the course (YYYY-MM-DD)',
    type: String,
    format: 'date',
    example: '2025-12-15',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // ----- 🆕 New fields -----
  @ApiProperty({
    description:
      'Determines whether global or platform-level coupons can be applied to this program.',
    example: true,
    default: true,
  })
  @IsBoolean()
  allowPlatformCoupons: boolean;

  @ApiProperty({
    description: 'Defines the type or category of the program.',
    enum: ProgramType,
    example: ProgramType.COURSE,
  })
  @IsEnum(ProgramType)
  programType: ProgramType;

  @ApiPropertyOptional({
    description:
      'An array of supported languages for the program (e.g., ["English", "Arabic", "French"]).',
    type: [String],
    example: ['English', 'Arabic'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiProperty({
    description: 'Whether the course is free of charge',
    example: false,
  })
  @IsBoolean()
  isCourseFree: boolean;

  @ApiPropertyOptional({
    description: 'Course image URL or relative path',
    example: 'https://example.com/images/course.png',
  })
  @IsOptional()
  @IsString()
  courseImage?: string;

  @ApiPropertyOptional({
    description: 'Preview video URL or relative path',
    example: 'https://example.com/videos/preview.mp4',
  })
  @IsOptional()
  @IsString()
  previewVideo?: string;

  // ----- Live/Hybrid/Offline course fields -----
  @ApiPropertyOptional({
    description: 'Duration of the course (numeric value)',
    example: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  courseDuration?: number;

  @ApiPropertyOptional({
    description: 'Unit of time for the course duration',
    enum: DurationUnit,
    example: DurationUnit.WEEKS,
  })
  @IsOptional()
  @IsEnum(DurationUnit)
  courseDurationUnit?: DurationUnit;

  @ApiPropertyOptional({
    description: 'How often lectures occur (numeric count)',
    enum: LectureFrequencyCount,
    example: LectureFrequencyCount.TWICE,
  })
  @IsOptional()
  @IsEnum(LectureFrequencyCount)
  lectureFrequency?: LectureFrequencyCount;

  @ApiPropertyOptional({
    description: 'Unit of time for lecture frequency',
    enum: DurationUnit,
    example: DurationUnit.DAYS,
  })
  @IsOptional()
  @IsEnum(DurationUnit)
  lectureFrequencyUnit?: DurationUnit;

  @ApiPropertyOptional({
    description: 'Total number of lectures in the course',
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfLectures?: number;

  @ApiPropertyOptional({
    description: 'Total hours of the course content',
    example: 40,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalHours?: number;

  @ApiPropertyOptional({
    type: CourseMetadataDto,
    description: 'Additional structured metadata about the course',
    example: {
      courseOverview: '<p>This course teaches you the basics of NestJS...</p>',
      whoCanAttend: {
        text: 'This course is designed for:',
        items: ['Aspiring developers', 'Backend engineers', 'Tech enthusiasts'],
      },
      whatWillYouLearn: {
        text: 'By the end of the course, you will be able to:',
        items: [
          'Build REST APIs with NestJS',
          'Implement authentication and authorization',
          'Integrate with databases using TypeORM',
        ],
      },
      faqs: [
        {
          question: 'Do I need prior programming experience?',
          answer: 'Basic JavaScript knowledge is recommended.',
        },
        {
          question: 'Will I get a certificate?',
          answer: 'Yes, upon successful completion of the course.',
        },
      ],
      seo: {
        metaTitle: 'Master NestJS Backend Development | Build Scalable APIs',
        metaKeywords: ['nestjs', 'backend', 'typescript', 'api development'],
        metaDescription:
          'A comprehensive course covering NestJS fundamentals, API design, TypeORM, and deployment. Start building modern, scalable backend applications today.',
        metaImage: 'https://cdn.example.com/course-images/nestjs-seo.png',
      },
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CourseMetadataDto)
  metadata?: CourseMetadataDto;

  @ApiPropertyOptional({
    type: [CreateCoursePricingDto],
    description: 'Optional course pricing information',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateCoursePricingDto)
  pricings?: CreateCoursePricingDto[];

  @ApiPropertyOptional({
    description:
      'List of academy instructor IDs associated with this course (non-user instructors)',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '770e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  academyInstructorIds?: string[];
}
