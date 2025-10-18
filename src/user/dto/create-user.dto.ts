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
      name: 'Nested Academy',
      description: 'Optional academy details for reference',
      slug: 'nested-academy',
      image: 'https://example.com/images/nested-academy.png',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAcademyDto)
  academy?: CreateAcademyDto;
}
