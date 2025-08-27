import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateAcademyInstructorDto {
  @ApiProperty({
    description: 'Full name of the instructor',
    example: 'Dr. Sarah Johnson',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Photo URL of the instructor',
    example: 'https://example.com/photos/sarah.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({
    description: 'Biography or background of the instructor',
    example:
      'Sarah Johnson has over 10 years of experience teaching mathematics...',
    required: false,
  })
  @IsOptional()
  @IsString()
  biography?: string;
}
