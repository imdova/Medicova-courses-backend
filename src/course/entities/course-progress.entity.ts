import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { CourseStudent } from './course-student.entity';
import { CourseSectionItem } from '../course-section/entities/course-section-item.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('course_progress')
export class CourseProgress extends BasicEntity {
  @ApiProperty({
    description: 'The course enrollment this progress belongs to',
    type: () => CourseStudent,
  })
  @ManyToOne(() => CourseStudent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_student_id' })
  courseStudent: CourseStudent;

  @ApiProperty({
    description: 'The course section item (lecture, quiz, assignment)',
    type: () => CourseSectionItem,
  })
  @ManyToOne(() => CourseSectionItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: CourseSectionItem;

  @ApiProperty({
    description: 'Whether the item has been completed by the student',
    example: false,
  })
  @Column({ default: false })
  completed: boolean;

  @ApiPropertyOptional({
    description: 'Score for quizzes/assignments. Null for lectures',
    example: 85.5,
  })
  @Column({ type: 'float', nullable: true })
  score?: number;
}
