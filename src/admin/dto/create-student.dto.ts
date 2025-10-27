import {
    IsEmail,
    IsString,
    IsUUID,
    MinLength,
    IsNotEmpty,
    IsArray,
    IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStudentDto {
    @ApiProperty({
        description: 'Student email address',
        example: 'new.student@example.com',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Student password (min 8 characters)',
        example: 'StrongP@ss123',
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8, { message: 'Password must be at least 8 characters long.' })
    password: string;

    @ApiProperty({
        description: 'Student first name',
        example: 'John',
    })
    @IsString()
    @IsNotEmpty()
    firstName: string;

    @ApiProperty({
        description: 'Student last name',
        example: 'Doe',
    })
    @IsString()
    @IsNotEmpty()
    lastName: string;

    @ApiProperty({
        description: 'Student phone number',
        example: '+15551234567',
    })
    @IsString()
    @IsNotEmpty()
    phoneNumber: string;

    @ApiProperty({
        description: 'Optional list of course IDs (UUIDs) to enroll the student into immediately.',
        type: [String],
        example: ['550e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440001'],
        required: false,
    })
    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true, message: 'Each courseId must be a valid UUID.' })
    courseIds?: string[];
}