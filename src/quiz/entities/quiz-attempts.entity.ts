import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { Quiz } from './quiz.entity';
import { ApiProperty } from '@nestjs/swagger';
import { QuizAnswerDto } from 'src/quiz/dto/submit-quiz.dto';
import { User } from 'src/user/entities/user.entity';

@Entity('quiz_attempts')
export class QuizAttempt extends BasicEntity {
  @ApiProperty({
    description: 'The student-course enrollment this attempt belongs to',
    type: () => CourseStudent,
  })
  @ManyToOne(() => CourseStudent, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'course_student_id' })
  courseStudent?: CourseStudent;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @ApiProperty({
    description: 'The quiz being attempted',
    type: () => Quiz,
  })
  @ManyToOne(() => Quiz, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @ApiProperty({
    description: 'Answers provided in this attempt',
    type: [QuizAnswerDto],
    example: [
      { questionId: 'uuid1', correct: true },
      { questionId: 'uuid2', correct: false },
    ],
  })
  @Column({ type: 'json' })
  answers: QuizAnswerDto[];

  @ApiProperty({
    description: 'Score obtained in this attempt',
    example: 80,
  })
  @Column({ type: 'float' })
  score: number;

  @ApiProperty({
    description: 'Time taken by the student to solve the quiz (in minutes)',
    example: 12.5,
  })
  @Column({ type: 'float', nullable: true })
  timeTaken?: number;

  @ApiProperty({
    description: 'Whether the student passed this attempt',
    example: true,
  })
  @Column({ default: false })
  passed: boolean;
}
