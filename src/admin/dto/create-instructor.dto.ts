// src/admin/dto/create-instructor.dto.ts
import {
    IsEmail,
    IsString,
    IsUUID,
    MinLength,
    IsNotEmpty,
    IsOptional,
    IsUrl,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CountryOrStateDTO } from 'src/profile/dto/country-state.dto';

export class CreateInstructorDto {
    @ApiProperty({
        description: 'Instructor email address',
        example: 'instructor@example.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Instructor password (min 8 characters)',
        example: 'StrongP@ss123',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long.' })
    password: string;

    @ApiProperty({
        description: 'Instructor first name',
        example: 'John',
    })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({
        description: 'Instructor last name',
        example: 'Doe',
    })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiPropertyOptional({
        description: 'Instructor username (will be auto-generated if not provided)',
        example: 'john.doe',
    })
    @IsOptional()
    @IsString()
    userName?: string;

    @ApiPropertyOptional({
        description: 'Profile photo URL',
        example: 'https://example.com/profile.jpg',
    })
    @IsOptional()
    @IsUrl()
    photoUrl?: string;

    @ApiPropertyOptional({
        description: 'Instructor phone number',
        example: '+15551234567',
    })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiPropertyOptional({
        description: 'Country of residence',
        type: CountryOrStateDTO,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CountryOrStateDTO)
    country?: CountryOrStateDTO;

    @ApiPropertyOptional({
        description: 'State/Province of residence',
        type: CountryOrStateDTO,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => CountryOrStateDTO)
    state?: CountryOrStateDTO;

    @ApiPropertyOptional({
        description: 'City of residence',
        example: 'New York',
    })
    @IsOptional()
    @IsString()
    city?: string;
}