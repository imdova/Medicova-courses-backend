import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { Assignment } from './assignment.entity';
import { CourseStudent } from '../../course/entities/course-student.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('assignment_submission')
export class AssignmentSubmission extends BasicEntity {
  @ManyToOne(() => Assignment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @Index()
  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId: string;

  @ManyToOne(() => CourseStudent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_student_id' })
  courseStudent: CourseStudent;

  @Index()
  @Column({ name: 'course_student_id', type: 'uuid' })
  courseStudentId: string;

  @ApiProperty({
    description: 'Optional file uploaded by student',
    example: 'url-to-uploaded-pdf',
  })
  @Column({ type: 'varchar', nullable: true })
  file_url?: string;

  @ApiProperty({
    description: 'Student notes or description',
    example: 'My essay submission',
  })
  @Column({ type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({
    description: 'Score assigned by teacher',
    example: 85,
    required: false,
  })
  @Column({ type: 'float', nullable: true })
  score?: number;

  @ApiProperty({
    description: 'Whether this submission has been graded',
    example: false,
  })
  @Index()
  @Column({ type: 'boolean', default: false })
  graded: boolean;
}
