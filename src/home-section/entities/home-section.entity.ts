import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum HomeSectionType {
    FEATURED_COURSES = 'featured_courses',
    TRENDING = 'trending',
    CATEGORY_SHOWCASE = 'category_showcase',
    BESTSELLER = 'bestseller',
    TOP_RATED = 'top_rated',
    TOP_BUNDLES = 'top_bundles',
    TOP_ACADEMIES = 'top_academies',
    TOP_INSTRUCTORS = 'top_instructors',
    PROMO_CARDS = 'promo_cards',
    TRAINING_COURSES_CARDS = 'training_courses_cards',
}

// JSON Config Interfaces
export interface FeaturedCoursesConfig {
    type: 'featured_courses';
    courses: Array<{
        courseId: string;
        order: number;
    }>;
}

export interface TrendingConfig {
    type: 'trending';
    categoryCourses: Array<{
        categoryId: string;
        order: number;
        courses: Array<{
            courseId: string;
            order: number;
        }>;
    }>;
}

export interface PromoCardsConfig {
    type: 'promo_cards';
    promoCards: Array<{
        linkUrl?: string;
        imageUrl: string;
        order: number;
    }>;
}

export interface TrainingCoursesCardsConfig {
    type: 'training_courses_cards';
    trainingCoursesCards: Array<{
        linkUrl?: string;
        imageUrl: string;
        order: number;
    }>;
}

export interface CategoryShowcaseConfig {
    type: 'category_showcase';
    categories: Array<{
        categoryId: string;
        order: number;
    }>;
}

export interface CourseListConfig {
    type: 'bestseller' | 'top_rated';
    courses: Array<{
        courseId: string;
        order: number;
    }>;
}

export interface TopBundleConfig {
    type: 'top_bundles';
    bundles: Array<{
        bundleId: string;
        order: number;
    }>;
}

export interface TopAcademiesConfig {
    type: 'top_academies';
    academies: Array<{
        academyId: string;
        order: number;
    }>;
}

export interface TopInstructorsConfig {
    type: 'top_instructors';
    instructors: Array<{
        instructorId: string;
        order: number;
    }>;
}

export type HomeSectionConfig =
    | FeaturedCoursesConfig
    | TrendingConfig
    | CategoryShowcaseConfig
    | CourseListConfig
    | TopBundleConfig
    | TopAcademiesConfig
    | TopInstructorsConfig
    | PromoCardsConfig;

@Entity('home_sections')
export class HomeSection extends BasicEntity {
    @ApiProperty({
        description: 'Type of home section',
        enum: HomeSectionType,
    })
    @Column({
        type: 'enum',
        enum: HomeSectionType,
        unique: true
    })
    sectionType: HomeSectionType;

    @ApiProperty({
        description: 'Whether this section is active',
        default: true,
    })
    @Column({ default: true })
    isActive: boolean;

    @ApiProperty({
        description: 'Section configuration and content as JSON',
    })
    @Column({ type: 'jsonb', default: {} })
    config: Record<string, any>; // Use any for flexibility, we'll validate in service
}