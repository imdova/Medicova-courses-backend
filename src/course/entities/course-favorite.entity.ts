import { Entity, ManyToOne, JoinColumn, Unique, Index, Column } from 'typeorm';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';
import { Course } from './course.entity';

@Entity('course_favorite')
@Unique(['student', 'course'])
export class CourseFavorite extends BasicEntity {
    @ManyToOne(() => User, (user) => user.enrollments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'student_id' })
    student: User;

    @Index()
    @Column({ name: 'student_id', type: 'uuid' })
    studentId: string;

    @ManyToOne(() => Course, (course) => course.enrollments, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Index()
    @Column({ name: 'course_id', type: 'uuid' })
    courseId: string;
}
