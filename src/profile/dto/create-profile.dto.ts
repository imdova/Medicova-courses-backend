import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsUrl,
  ValidateNested,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, MaritalStatus } from '../entities/profile.entity';
import { ProfileMetadataDto } from './profile-metadata.dto';
import { CountryOrStateDTO } from './country-state.dto';

class LanguageDto {
  @ApiProperty({ example: 'Arabic', description: 'Name of the language' })
  @IsString()
  language: string;

  @ApiProperty({ example: 'Intermediate', description: 'Proficiency level' })
  @IsString()
  level: string;
}

export class CreateProfileDto {
  @ApiProperty({ example: 'Mohamed', description: 'First name of the user' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Sayed', description: 'Last name of the user' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({
    example: '/uploads/photo.jpg',
    description: 'Profile photo URL',
  })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiPropertyOptional({
    example: 'mohamed.sayed',
    description: 'Custom username (optional)',
  })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiPropertyOptional({
    example: '+20100234567',
    description: 'Phone number of the user',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indicates if phone number is a WhatsApp number',
  })
  @IsOptional()
  @IsBoolean()
  hasWhatsapp?: boolean;

  @ApiPropertyOptional({
    example: '+20100234567',
    description: 'Separate WhatsApp phone number',
  })
  @IsOptional()
  @IsString()
  phoneNumbertForWhatsapp?: string;

  @ApiPropertyOptional({
    example: '1980-05-20',
    description: 'Date of birth (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: Date;

  @ApiPropertyOptional({
    enum: Gender,
    example: Gender.MALE,
    description: 'Gender of the user',
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({
    example: 'Egyptian',
    description: 'Nationality of the user',
  })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({
    enum: MaritalStatus,
    example: MaritalStatus.MARRIED,
    description: 'Marital status of the user',
  })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the user has a driving license',
  })
  @IsOptional()
  @IsBoolean()
  hasDrivingLicense?: boolean;

  @ApiPropertyOptional({
    example: '/uploads/resume.pdf',
    description: 'Path to the uploaded resume file',
  })
  @IsOptional()
  @IsString()
  resumePath?: string;

  @ApiPropertyOptional({
    example: 'dr.mohamed@example.com',
    description: 'Contact email of the user',
  })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({
    example: 'https://linkedin.com/in/mohamedsayed',
    description: 'LinkedIn profile URL',
  })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({
    type: [LanguageDto],
    description: 'List of languages and proficiency levels',
    example: [
      { language: 'Arabic', level: 'Intermediate' },
      { language: 'English', level: 'Intermediate' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @ApiPropertyOptional({
    type: ProfileMetadataDto,
    description:
      'Structured instructor metadata (experience, education, skills, etc.)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfileMetadataDto)
  metadata?: ProfileMetadataDto;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the instructor profile is publicly visible',
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'ID of the category',
    example: 'e13fb4e6-a585-40fa-a0a4-c61a4761adbe',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'ID of the speciality',
    example: '6aefc0e6-9ead-410b-a296-a0263b9f867a',
  })
  @IsOptional()
  @IsUUID()
  specialityId?: string;

  @ApiPropertyOptional({
    type: () => CountryOrStateDTO,
    description: 'Country of residence (optional)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CountryOrStateDTO)
  country?: CountryOrStateDTO;

  @ApiPropertyOptional({
    type: () => CountryOrStateDTO,
    description: 'State of residence (optional)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CountryOrStateDTO)
  state?: CountryOrStateDTO;

  @ApiPropertyOptional({
    example: 'Cairo',
    description: 'City of residence (optional)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}
