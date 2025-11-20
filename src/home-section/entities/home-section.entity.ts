import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum HomeSectionType {
    FEATURED_COURSES = 'featured_courses',
    TRENDING = 'trending',
    CATEGORY_SHOWCASE = 'category_showcase',
    BESTSELLER = 'bestseller',
    TOP_RATED = 'top_rated',
}

export enum ContentType {
    COURSE = 'course',
    CATEGORY = 'category',
    PROMO_CARD = 'promo_card',
}

@Entity('home_sections')
@Index(['sectionType', 'position'], { unique: true })
@Index(['sectionType', 'order'])
export class HomeSection extends BasicEntity {
    @ApiProperty({
        description: 'Type of home section',
        enum: HomeSectionType,
    })
    @Column({
        type: 'enum',
        enum: HomeSectionType,
    })
    sectionType: HomeSectionType;

    @ApiProperty({
        description: 'Type of content in this section item',
        enum: ContentType,
    })
    @Column({
        type: 'enum',
        enum: ContentType,
    })
    contentType: ContentType;

    @ApiProperty({
        description: 'Reference ID (course ID, category ID, etc.)',
    })
    @Column({ type: 'uuid' })
    referenceId: string;

    @ApiProperty({
        description: 'Display title (optional, can be different from original name)',
        nullable: true,
    })
    @Column({ type: 'varchar', length: 255, nullable: true })
    displayTitle: string;

    @ApiProperty({
        description: 'Display subtitle (optional)',
        nullable: true,
    })
    @Column({ type: 'varchar', length: 255, nullable: true })
    displaySubtitle: string;

    @ApiProperty({
        description: 'Image URL for promo cards (optional)',
        nullable: true,
    })
    @Column({ type: 'varchar', length: 500, nullable: true })
    imageUrl: string;

    @ApiProperty({
        description: 'Position in the section (e.g., 1-4 for featured courses)',
    })
    @Column({ type: 'int' })
    position: number;

    @ApiProperty({
        description: 'Order for sorting within the same position',
        default: 0,
    })
    @Column({ type: 'int', default: 0 })
    order: number;

    @ApiProperty({
        description: 'Additional metadata for different section types',
        nullable: true,
    })
    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @ApiProperty({
        description: 'Whether this section item is active',
        default: true,
    })
    @Column({ default: true })
    isActive: boolean;
}