import { Entity, ManyToOne, JoinColumn, Column } from 'typeorm';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';
import { Course } from './course.entity';

@Entity('course_student')
export class CourseStudent extends BasicEntity {
  @ManyToOne(() => User, (user) => user.enrollments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Course, (course) => course.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
