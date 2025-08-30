import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsArray,
} from 'class-validator';

export class CreateProfileCategoryDto {
  @ApiProperty({
    description: 'Name of the profile category',
    example: 'Engineering',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Slug for SEO-friendly URLs',
    example: 'engineering',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional({
    description: 'Optional description for the category',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Optional image URL for category thumbnail',
    example: 'https://cdn.example.com/images/engineering.png',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  image?: string;

  @ApiPropertyOptional({
    description:
      'List of specialities (names only) to create under this category',
    type: [String],
    example: ['Civil Engineering', 'Mechanical Engineering'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialities?: string[];
}
