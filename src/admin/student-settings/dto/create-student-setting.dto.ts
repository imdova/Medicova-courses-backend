import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, IsBoolean, IsOptional, Min, MaxLength, Matches, IsUUID } from 'class-validator';
import { SettingType } from '../entities/student-setting.entity';

export class CreateStudentSettingDto {
    @ApiProperty({
        description: 'The type of setting being defined',
        enum: SettingType,
        example: SettingType.DEGREE,
    })
    @IsEnum(SettingType)
    type: SettingType;

    @ApiProperty({
        description: 'Display order/priority of the setting (1-10)',
        example: 1,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    priority: number;

    @ApiProperty({
        description: 'The display name or label of the setting value',
        maxLength: 50,
        example: 'Bachelor',
    })
    @IsString()
    @MaxLength(50)
    displayName: string;

    @ApiProperty({
        description: 'The actual system/database value (auto-generated if not provided)',
        maxLength: 50,
        example: 'bachelor',
        required: false,
    })
    @IsString()
    @MaxLength(50)
    @Matches(/^[a-z0-9_]+$/, {
        message: 'Value can only contain lowercase letters, numbers, and underscores',
    })
    @IsOptional()
    value?: string;

    @ApiPropertyOptional({
        description: 'Whether the setting is active and available for use',
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'ID of the parent setting for hierarchical relationships',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsUUID()
    @IsOptional()
    parentId?: string;
}