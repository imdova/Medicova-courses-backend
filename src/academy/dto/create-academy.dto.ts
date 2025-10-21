import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsInt,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { AcademySize, AcademyType } from '../entities/academy.entity';

export class CreateAcademyDto {
  @ApiProperty({
    description: 'Name of the academy',
    example: 'Bright Future Academy',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Slug for SEO-friendly URLs',
    example: 'bright-future-academy',
  })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiProperty({
    description: 'Short description of the academy',
    example: 'A leading online learning platform for tech and innovation.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Detailed "About" section for the academy',
    example:
      'Bright Future Academy provides top-quality online education programs in AI, software engineering, and design.',
    required: false,
  })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiProperty({
    description: 'Logo image URL of the academy',
    example: 'https://example.com/images/bright-future-logo.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Cover banner image URL for the academy page',
    example: 'https://example.com/images/bright-future-cover.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  cover?: string;

  @ApiProperty({
    description: 'Relevant keywords for the academy’s domain',
    example: ['Technology', 'Innovation', 'AI', 'Coding'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyWords?: string[];

  @ApiProperty({
    description: 'Type of academy',
    enum: AcademyType,
    example: AcademyType.ACADEMY,
    required: false,
  })
  @IsOptional()
  @IsEnum(AcademyType)
  type?: AcademyType;

  @ApiProperty({
    description: 'Organization size range',
    enum: AcademySize,
    example: AcademySize.SIZE_101_500,
    required: false,
  })
  @IsOptional()
  @IsEnum(AcademySize)
  size?: AcademySize;

  @ApiProperty({
    description: 'Year the academy was founded',
    example: 2015,
    required: false,
  })
  @IsOptional()
  @IsInt()
  foundedYear?: number;

  @ApiProperty({
    description: 'Full address of the academy',
    example: '123 Innovation Drive, San Francisco, CA 94107, USA',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Public contact email (for inquiries)',
    example: 'contact@brightfutureacademy.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({
    description: 'Public contact phone number',
    example: '+1 415 555 1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'City information (name and code)',
    example: { name: 'San Francisco', code: 'SF' },
    required: false,
  })
  @IsOptional()
  city?: { name: string; code: string } | null;

  @ApiProperty({
    description: 'Country information (name and code)',
    example: { name: 'United States', code: 'US' },
    required: false,
  })
  @IsOptional()
  country?: { name: string; code: string } | null;

  @ApiProperty({
    description: 'Social media and website links for the academy',
    example: {
      website: 'https://brightfutureacademy.com',
      facebook: 'https://facebook.com/brightfutureacademy',
      linkedin: 'https://linkedin.com/company/brightfutureacademy',
      instagram: 'https://instagram.com/brightfutureacademy',
    },
    required: false,
  })
  @IsOptional()
  socialLinks?: Record<string, string | null>;

  @ApiProperty({
    description: 'Gallery of images (e.g., campus, events, facilities)',
    example: [
      'https://example.com/gallery/campus1.jpg',
      'https://example.com/gallery/event2.jpg',
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery?: string[];

  @ApiProperty({
    description: 'Whether to display real or fake student count publicly',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  displayRealStudentsCount?: boolean;

  @ApiProperty({
    description: 'Custom fake student count for public display',
    example: 1200,
    required: false,
  })
  @IsOptional()
  @IsInt()
  fakeStudentsCount?: number;
}
