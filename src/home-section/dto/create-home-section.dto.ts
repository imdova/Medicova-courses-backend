import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID, IsInt, Min, Max, IsOptional, IsString, IsObject, IsBoolean } from 'class-validator';
import { HomeSectionType, ContentType } from '../entities/home-section.entity';

export class CreateHomeSectionDto {
    @ApiProperty({ description: 'Type of home section', enum: HomeSectionType })
    @IsEnum(HomeSectionType)
    sectionType: HomeSectionType;

    @ApiProperty({ description: 'Type of content', enum: ContentType })
    @IsEnum(ContentType)
    contentType: ContentType;

    @ApiProperty({ description: 'Reference ID (course ID, category ID, etc.)' })
    @IsUUID()
    referenceId: string;

    @ApiProperty({ description: 'Position in section', required: false })
    @IsOptional()
    @IsInt()
    @Min(1)
    position?: number;

    @ApiProperty({ description: 'Order for sorting', default: 0 })
    @IsOptional()
    @IsInt()
    order?: number;

    @ApiProperty({ description: 'Display title', required: false })
    @IsOptional()
    @IsString()
    displayTitle?: string;

    @ApiProperty({ description: 'Display subtitle', required: false })
    @IsOptional()
    @IsString()
    displaySubtitle?: string;

    @ApiProperty({ description: 'Image URL for promo cards', required: false })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiProperty({ description: 'Additional metadata', required: false })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @ApiProperty({ description: 'Whether item is active', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}