import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasicEntity } from '../../../common/entities/basic.entity';
import { Course } from '../../entities/course.entity';

// 🟢 NEW: Define the structure for FAQ (Frequently Asked Questions)
export interface FaqItem {
  question: string;
  answer: string;
}

// 🟢 NEW: Define the structure for all SEO Meta Information
export interface SeoMeta {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

@Entity('course_categories')
export class CourseCategory extends BasicEntity {
  @ApiProperty({
    description: 'User ID of the admin who created the course-category',
    format: 'uuid',
  })
  @Index()
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ApiProperty({ description: 'Name of the category', maxLength: 255 })
  @Column({ length: 255, unique: true })
  name: string;

  @ApiPropertyOptional({ description: 'Slug for SEO-friendly URLs' })
  @Column({ length: 255, unique: true })
  slug: string;

  @ApiPropertyOptional({ description: 'Category description', maxLength: 500 })
  @Column({ length: 500, nullable: true })
  description?: string;

  // ✅ New priority field
  @ApiPropertyOptional({
    description: 'Priority of the category (higher number = higher priority)',
    default: 0,
  })
  @Index()
  @Column({ type: 'int', default: 0 })
  priority: number;

  // ✅ New isActive field
  @ApiPropertyOptional({
    description: 'Whether the category is visible and active',
    default: true,
  })
  @Index()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Image URL for category thumbnail' })
  @Column({ length: 500, nullable: true })
  image?: string;

  // 🟢 NEW FIELD: SVG Icon
  @ApiPropertyOptional({
    description: 'SVG icon content or URL for the category',
    maxLength: 5000, // Adjusted length for potentially storing raw SVG content
  })
  @Column({ type: 'text', nullable: true, name: 'svg_icon' })
  svgIcon?: string;

  // ✅ Self-referencing relationship
  @ManyToOne(() => CourseCategory, (category) => category.subcategories, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: CourseCategory;

  @Index()
  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string;

  @OneToMany(() => CourseCategory, (category) => category.parent)
  subcategories?: CourseCategory[];

  @OneToMany(() => Course, (course) => course.category)
  courses: Course[];

  @ApiPropertyOptional({ description: 'A short, catchy headline for the category' })
  @Column({ length: 500, nullable: true, name: 'category_headline' })
  categoryHeadline?: string; // Corresponds to 'Category Headline'

  @ApiPropertyOptional({ description: 'Detailed description with rich formatting' })
  @Column({ type: 'text', nullable: true, name: 'rich_description' })
  richDescription?: string; // Corresponds to 'Rich Description'

  @ApiPropertyOptional({ description: 'Frequently Asked Questions (JSON array)' })
  @Column({ type: 'jsonb', nullable: true })
  faqs?: FaqItem[]; // Corresponds to 'Frequently Asked Questions'

  @ApiPropertyOptional({ description: 'SEO Meta information (Title, Description, Keywords)' })
  @Column({ type: 'jsonb', nullable: true, name: 'seo_meta' })
  seoMeta?: SeoMeta;
}
