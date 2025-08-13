import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLectureDto {
  @ApiProperty({
    description: 'Title of the lecture',
    example: 'Introduction to NestJS',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the lecture',
    example:
      'This lecture covers the basics of NestJS and setting up a project.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'URL of the lecture video',
    example: 'https://example.com/videos/nestjs-intro.mp4',
  })
  @IsString()
  videoUrl: string;

  @ApiPropertyOptional({
    description: 'Material file URL (PDF, Word, etc.)',
    example: 'https://example.com/materials/nestjs-intro.pdf',
  })
  @IsOptional()
  @IsString()
  materialUrl?: string;

  @ApiProperty({
    description: 'Is the lecture free?',
    default: false,
    example: false,
  })
  @IsBoolean()
  isLectureFree: boolean;
}
