// import { ApiProperty } from '@nestjs/swagger';
// import { IsEnum, IsArray, ValidateNested } from 'class-validator';
// import { Type } from 'class-transformer';
// import { HomeSectionType } from '../entities/home-section.entity';

// class BulkSectionItem {
//     @ApiProperty({ description: 'Reference ID (course ID, category ID, etc.)' })
//     referenceId: string;

//     @ApiProperty({ description: 'Content type', enum: ContentType })
//     contentType: ContentType;

//     @ApiProperty({ description: 'Position in section' })
//     position: number;

//     @ApiProperty({ description: 'Order for sorting', default: 0 })
//     order?: number;

//     @ApiProperty({ description: 'Display title', required: false })
//     displayTitle?: string;

//     @ApiProperty({ description: 'Display subtitle', required: false })
//     displaySubtitle?: string;

//     @ApiProperty({ description: 'Image URL for promo cards', required: false })
//     imageUrl?: string;

//     @ApiProperty({ description: 'Additional metadata', required: false })
//     metadata?: Record<string, any>;
// }

// export class BulkUpdateSectionsDto {
//     @ApiProperty({ enum: HomeSectionType, description: 'Section type to update' })
//     @IsEnum(HomeSectionType)
//     sectionType: HomeSectionType;

//     @ApiProperty({ type: [BulkSectionItem] })
//     @IsArray()
//     @ValidateNested({ each: true })
//     @Type(() => BulkSectionItem)
//     items: BulkSectionItem[];
// }