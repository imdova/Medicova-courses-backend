import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { ApiProperty } from '@nestjs/swagger';
import { AssignmentSubmission } from './assignment-submission.entity';
import { Academy } from 'src/academy/entities/academy.entity';

@Entity('assignments')
export class Assignment extends BasicEntity {
  @ApiProperty({
    description: 'Assignment title',
    example: 'Essay on AI Ethics',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ description: 'Start date of assignment', type: String, format: 'date-time' })
  @Column({ type: 'timestamptz', nullable: true }) // ✅ stores full timestamp with timezone
  start_date: Date;

  @ApiProperty({ description: 'End date of assignment', type: String, format: 'date-time' })
  @Column({ type: 'timestamptz', nullable: true }) // ✅ same here
  end_date: Date;

  @ApiProperty({ description: 'Instructions for the assignment' })
  @Column({ type: 'text' })
  instructions: string;

  //   @ApiProperty({ description: 'Grading scale (e.g. 0-100, Pass/Fail)' })
  //   @Column({ type: 'varchar', length: 50 })
  //   grading_scale: string;

  @ApiProperty({
    description: 'Optional attachment (PDF, Doc, etc.)',
    required: false,
  })
  @Column({ type: 'varchar', nullable: true })
  attachment_url?: string;

  @ApiProperty({
    description: 'Total points available for this assignment',
    example: 100,
  })
  @Column({ type: 'int', default: 0 })
  totalPoints: number;

  @ApiProperty({
    description: 'Number of questions in the assignment',
    example: 10,
  })
  @Column({ type: 'int', default: 0 })
  numberOfQuestions: number;

  @ApiProperty({
    description: 'User ID of the teacher/admin who created the assignment',
    format: 'uuid',
  })
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @OneToMany(() => AssignmentSubmission, (submission) => submission.assignment)
  submissions: AssignmentSubmission[];

  @ManyToOne(() => Academy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academy_id' })
  academy: Academy;
}
