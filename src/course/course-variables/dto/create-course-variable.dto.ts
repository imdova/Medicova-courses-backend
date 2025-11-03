import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsBoolean, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CourseVariableType } from '../entities/course-variable.entity'; // Import the Enum

export class CreateCourseVariableDto {

    @ApiProperty({
        description: 'The type of variable being defined (e.g., Course Type, Program Type).',
        enum: CourseVariableType,
        example: CourseVariableType.COURSE_TYPE,
    })
    @IsEnum(CourseVariableType)
    @IsNotEmpty()
    type: CourseVariableType; // Required (*)

    @ApiProperty({
        description: 'A numeric value determining the display order/priority of the variable.',
        example: 1,
        minimum: 1,
    })
    @Type(() => Number) // Ensure the incoming value is treated as a number
    @IsInt()
    @Min(1)
    @IsNotEmpty()
    priority: number; // Required (*)

    @ApiProperty({
        description: 'The user-facing display name or label of the variable (e.g., Recorded, Live, Master).',
        maxLength: 50,
        example: 'Recorded',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    displayName: string; // Required (*)

    @ApiProperty({
        description: 'The actual system/database value associated with the variable (e.g., recorded, live, hybrid).',
        maxLength: 50,
        example: 'recorded',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    value: string; // Required (*)

    @ApiPropertyOptional({
        description: 'Whether the variable is active and available for use. Defaults to true.',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}