import { PickType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsDateString, IsPhoneNumber, IsEmail, MinLength } from 'class-validator';

// Create a base DTO with only the fields you want from CreateUserDto
class CreateEmployeeBaseDto extends PickType(CreateUserDto, [
    'email',
    'password',
    'firstName',
    'lastName',
    'photoUrl',
] as const) { }

export class CreateEmployeeDto extends CreateEmployeeBaseDto {
    @ApiProperty({
        description: 'Department ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    departmentId: string;

    @ApiProperty({
        example: 'Marketing Manager',
        description: 'Job title',
    })
    @IsString()
    jobTitle: string;

    @ApiProperty({
        example: 'Senior',
        description: 'Job level',
    })
    @IsString()
    jobLevel: string;

    @ApiPropertyOptional({
        example: '+20100234567',
        description: 'Phone number',
    })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiPropertyOptional({
        example: 'employee',
        description: 'Role defaults to "employee"',
        default: 'employee',
    })
    @IsOptional()
    @IsString()
    role?: string = 'employee';
}