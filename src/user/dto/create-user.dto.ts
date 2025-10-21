import {
  IsOptional,
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsNotEmpty,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { CreateAcademyDto } from 'src/academy/dto/create-academy.dto';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Unique email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({
    example: 'StrongPass123!',
    description: 'Password of the user (minimum 8 characters)',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({
    example: 'student',
    description:
      'Role of the user in the system. If not provided, defaults to "student".',
  })
  @IsString()
  @IsOptional() // optional so default can apply in entity
  role?: string;

  // New optional profile fields
  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/photo.jpg',
    description: 'Profile photo URL',
  })
  @IsString()
  @IsUrl()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({
    description:
      'Optional nested academy object (used when embedding academy details)',
    type: () => CreateAcademyDto,
    example: {
      name: 'Bright Future Academy',
      slug: 'bright-future-academy',
      description: 'A leading academy specializing in online technology training.',
      about:
        'Bright Future Academy offers top-tier online programs in AI, software engineering, and data science. Our goal is to empower students through practical learning.',
      image: 'https://example.com/images/bright-future-logo.png',
      cover: 'https://example.com/images/bright-future-cover.jpg',
      keyWords: ['Technology', 'AI', 'Coding', 'Data Science'],
      type: 'Academy',
      size: '51-100',
      foundedYear: 2010,
      address: '123 Innovation Street, San Francisco, CA',
      city: { name: 'San Francisco', code: 'SF' },
      country: { name: 'United States', code: 'US' },
      phone: '+1 555 123 4567',
      socialLinks: {
        website: 'https://brightfuture.edu',
        facebook: 'https://facebook.com/brightfutureacademy',
        twitter: 'https://twitter.com/brightfuture',
        instagram: 'https://instagram.com/brightfutureacademy',
        linkedin: 'https://linkedin.com/company/brightfutureacademy',
        youtube: 'https://youtube.com/@brightfutureacademy',
      },
      gallery: [
        'https://example.com/images/gallery1.jpg',
        'https://example.com/images/gallery2.jpg',
      ],
      displayRealStudentsCount: true,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAcademyDto)
  academy?: CreateAcademyDto;
}
