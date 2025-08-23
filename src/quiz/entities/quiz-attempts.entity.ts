import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { Quiz } from './quiz.entity';
import { ApiProperty } from '@nestjs/swagger';
import { QuizAnswerDto } from 'src/quiz/dto/submit-quiz.dto';

@Entity('quiz_attempts')
export class QuizAttempt extends BasicEntity {
  @ApiProperty({
    description: 'The student-course enrollment this attempt belongs to',
    type: () => CourseStudent,
  })
  @ManyToOne(() => CourseStudent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_student_id' })
  courseStudent: CourseStudent;

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
    description: 'Whether the student passed this attempt',
    example: true,
  })
  @Column({ default: false })
  passed: boolean;
}
