import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { CourseSection } from './course-section.entity';
import { Lecture } from './lecture.entity';
import { BasicEntity } from '../../../common/entities/basic.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Quiz } from 'src/quiz/entities/quiz.entity';
import { Assignment } from 'src/assignment/entities/assignment.entity';
import { CourseProgress } from 'src/course/course-progress/entities/course-progress.entity';

export enum CurriculumType {
  LECTURE = 'lecture',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
}

@Entity('course_section_items')
export class CourseSectionItem extends BasicEntity {
  @ManyToOne(() => CourseSection, (section) => section.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section: CourseSection;

  @Index()
  @Column({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @ApiProperty({
    description: 'Type of curriculum item (lecture or quiz)',
    enum: CurriculumType,
  })
  @Column({ type: 'enum', enum: CurriculumType })
  curriculumType: CurriculumType;

  @ApiProperty({ description: 'Order of the item in the section', example: 1 })
  @Column({ type: 'int' })
  order: number;

  @OneToOne(() => Lecture, (lecture) => lecture.item, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  lecture?: Lecture;

  @ManyToOne(() => Quiz, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz?: Quiz;

  @ManyToOne(() => Assignment, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: Assignment;

  @OneToMany(() => CourseProgress, (progress) => progress.item)
  progresses: CourseProgress[];
}
