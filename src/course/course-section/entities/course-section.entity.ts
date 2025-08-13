import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { CourseSectionItem } from './course-section-item.entity';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('course_sections')
export class CourseSection extends BasicEntity {
  @ManyToOne(() => Course, (course) => course.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ApiProperty({ description: 'Name of the section', example: 'Introduction' })
  @Column()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional section description',
    example: 'This section introduces the course and key concepts.',
  })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({
    description: 'Order of the section in the course',
    example: 1,
  })
  @Column({ type: 'int' })
  order: number;

  @OneToMany(() => CourseSectionItem, (item) => item.section, { cascade: true })
  items: CourseSectionItem[];
}
