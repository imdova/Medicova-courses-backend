import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CourseSection } from './course-section.entity';
import { Lecture } from './lecture.entity';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum CurriculumType {
  LECTURE = 'lecture',
  QUIZ = 'quiz',
}

@Entity('course_section_items')
export class CourseSectionItem extends BasicEntity {
  @ManyToOne(() => CourseSection, (section) => section.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section: CourseSection;

  @ApiProperty({
    description: 'Type of curriculum item (lecture or quiz)',
    enum: CurriculumType,
  })
  @Column({ type: 'enum', enum: CurriculumType })
  curriculumType: CurriculumType;

  @ApiProperty({ description: 'Order of the item in the section', example: 1 })
  @Column({ type: 'int' })
  order: number;

  @ManyToOne(() => Lecture, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curriculum_id' })
  lecture?: Lecture;
}
