import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { CountryOrStateDTO } from './country-state.dto';

export class ExperienceDto {
  @ApiProperty({ example: 'Senior Instructor' })
  @IsString()
  jobTitle: string;

  @ApiProperty({ example: 'Harvard University' })
  @IsString()
  companyOrOrganization: string;

  @ApiProperty({ example: 2015 })
  @IsInt()
  @Min(1900)
  startYear: number;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  currentlyWorkHere: boolean;

  @ApiProperty({ example: 2020, required: false })
  @IsOptional()
  @IsInt()
  @Min(1900)
  endYear?: number;

  @ApiProperty({ example: 6, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number;

  @ApiProperty({
    type: CountryOrStateDTO,
    required: false,
    description: 'Country where this experience took place',
  })
  @ValidateNested()
  @Type(() => CountryOrStateDTO)
  country?: CountryOrStateDTO;

  @ApiProperty({
    type: CountryOrStateDTO,
    required: false,
    description: 'State/Province where this experience took place',
  })
  @ValidateNested()
  @Type(() => CountryOrStateDTO)
  state?: CountryOrStateDTO;

  @ApiProperty({
    example: 'Cairo',
    required: false,
    description: 'City where this experience took place',
  })
  @IsString()
  city?: string;
}

export class EducationDto {
  @ApiProperty({ example: 'Cairo University' })
  @IsString()
  institute: string;

  @ApiProperty({ example: 'Computer Science' })
  @IsString()
  programName: string;

  @ApiProperty({ example: 'BSc' })
  @IsString()
  degreeAwarded: string;

  @ApiProperty({ example: 'Excellent', required: false })
  @IsOptional()
  @IsString()
  finalGrade?: string;

  @ApiProperty({ example: 2005 })
  @IsInt()
  @Min(1900)
  yearOfAdmission: number;

  @ApiProperty({ example: 2009 })
  @IsInt()
  @Min(1900)
  yearOfGraduation: number;
}

export class CourseDto {
  @ApiProperty({ example: 'JavaScript Basics' })
  @IsString()
  courseTitle: string;

  @ApiProperty({ example: 'Intro to JS programming' })
  @IsString()
  courseDescription: string;
}

export class ActivityDto {
  @ApiProperty({ example: 'Tech Conference Speaker' })
  @IsString()
  activityTitle: string;

  @ApiProperty({ example: 'Tech World' })
  @IsString()
  organizationInstitution: string;

  @ApiProperty({ example: '2023-05-15' })
  @IsDateString()
  activityDate: Date;
}
export class ProfileMetadataDto {
  @ApiProperty({
    type: String,
    example: 'Passionate software engineer with 5 years of experience.',
    required: false,
  })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ type: [ExperienceDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @ApiProperty({ type: [EducationDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiProperty({ type: [CourseDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CourseDto)
  courses?: CourseDto[];

  @ApiProperty({
    type: [String],
    example: ['JavaScript', 'TypeScript'],
    required: false,
  })
  @IsOptional()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ type: [ActivityDto], required: false })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ActivityDto)
  activities?: ActivityDto[];
}
