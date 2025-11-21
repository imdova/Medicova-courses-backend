import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsInt, Min, Max, IsOptional, IsString, IsObject, IsBoolean } from 'class-validator';
import { HomeSectionType, HomeSectionConfig } from '../entities/home-section.entity';

export class CreateHomeSectionDto {
    @ApiHideProperty()
    @IsEnum(HomeSectionType)
    sectionType: HomeSectionType;

    @ApiHideProperty()
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ description: 'Section configuration', required: false })
    @IsOptional()
    @IsObject()
    config?: Record<string, any>;
}