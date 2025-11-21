import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { HomeSectionType } from '../entities/home-section.entity';

class SectionOrderItem {
    @ApiProperty({ description: 'UUID of the home section record' })
    id: string;

    @ApiProperty({ description: 'New position' })
    position: number;

    @ApiProperty({ description: 'New order for sorting' })
    order: number;
}

export class UpdateSectionOrderDto {
    @ApiProperty({ enum: HomeSectionType, description: 'Section type to update order for' })
    @IsEnum(HomeSectionType)
    sectionType: HomeSectionType;

    @ApiProperty({ type: [SectionOrderItem] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SectionOrderItem)
    items: SectionOrderItem[];
}