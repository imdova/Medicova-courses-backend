import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasicEntity } from '../../../common/entities/basic.entity';
import { Course } from '../../entities/course.entity';

@Entity('course_categories')
export class CourseCategory extends BasicEntity {
  @ApiProperty({
    description: 'User ID of the teacher/admin who created the course',
    format: 'uuid',
  })
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

  @ApiPropertyOptional({ description: 'Image URL for category thumbnail' })
  @Column({ length: 500, nullable: true })
  image?: string;

  // ✅ Self-referencing relationship
  @ManyToOne(() => CourseCategory, (category) => category.subcategories, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent?: CourseCategory;

  @OneToMany(() => CourseCategory, (category) => category.parent)
  subcategories?: CourseCategory[];

  @OneToMany(() => Course, (course) => course.category)
  courses: Course[];
}
