import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsInt, Min, Max, IsOptional, IsString, IsObject, IsBoolean } from 'class-validator';
import { HomeSectionType, HomeSectionConfig } from '../entities/home-section.entity';

export class CreateHomeSectionDto {
    @ApiProperty({ description: 'Type of home section', enum: HomeSectionType })
    @IsEnum(HomeSectionType)
    sectionType: HomeSectionType;

    @ApiProperty({ description: 'Whether section is active', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ description: 'Section configuration', required: false })
    @IsOptional()
    @IsObject()
    config?: Record<string, any>;
}