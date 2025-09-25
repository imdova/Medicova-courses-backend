// dto/update-sections-with-items.dto.ts
import { IsArray, ValidateNested, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateCourseSectionDto } from './update-course-section.dto';
import { UpdateCourseSectionItemDto } from './update-course-section-item.dto';

export class UpdateSectionWithItemsDto {
    @ApiPropertyOptional({ description: 'Section ID - if provided, updates existing section; if omitted, creates new section' })
    @IsOptional()
    @IsUUID()
    id?: string;

    @ApiProperty({ description: 'Section data' })
    @ValidateNested()
    @Type(() => UpdateCourseSectionDto)
    section: UpdateCourseSectionDto;

    @ApiPropertyOptional({ description: 'Items to update/create', type: [UpdateCourseSectionItemDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateItemWithIdDto)
    items?: UpdateItemWithIdDto[];
}

export class UpdateItemWithIdDto extends UpdateCourseSectionItemDto {
    @ApiPropertyOptional({ description: 'Item ID - if provided, updates existing item; if omitted, creates new item' })
    @IsOptional()
    @IsUUID()
    id?: string;
}

export class UpdateMultipleSectionsWithItemsDto {
    @ApiProperty({ description: 'Sections to update/create', type: [UpdateSectionWithItemsDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateSectionWithItemsDto)
    sections: UpdateSectionWithItemsDto[];
}