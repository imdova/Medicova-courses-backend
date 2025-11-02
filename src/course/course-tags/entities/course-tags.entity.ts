import { Entity, Column } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasicEntity } from '../../../common/entities/basic.entity';

@Entity('course_tags')
export class CourseTag extends BasicEntity {
  @ApiProperty({ description: 'Tag name', example: 'NestJS' })
  @Column({ length: 50, unique: true })
  name: string;

  // 🟢 NEW: Slug for clean URLs and unique identification
  @ApiProperty({ description: 'Slug for SEO-friendly URLs', example: 'advanced' })
  @Column({ length: 50, unique: true, nullable: true })
  slug: string; // Required (*) in the frontend

  // 🟢 NEW: Brief description of the tag
  @ApiPropertyOptional({ description: 'Brief description of this tag' })
  @Column({ length: 255, nullable: true })
  description?: string;

  // 🟢 NEW: Tag color (e.g., hex code or predefined color name)
  @ApiProperty({ description: 'Color associated with the tag (e.g., #007bff)', example: '#5cb85c' })
  @Column({ length: 20, nullable: true })
  color: string; // Required (*) in the frontend

  // 🟢 NEW: Status field (Active/Inactive toggle)
  @ApiProperty({ description: 'Whether the tag is active/visible', default: true })
  @Column({ type: 'boolean', default: true, name: 'isActive' })
  isActive: boolean;
}
