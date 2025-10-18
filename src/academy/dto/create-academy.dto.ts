import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateAcademyDto {
  @ApiProperty({
    description: 'Name of the academy',
    example: 'Bright Future Academy',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Short description of the academy',
    example: 'A leading academy for online courses',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL or path to the academy image',
    example: 'https://example.com/images/bright-future.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'Slug for SEO-friendly URLs',
    example: 'web-development',
  })
  @IsString()
  @MaxLength(255)
  slug: string;
}
