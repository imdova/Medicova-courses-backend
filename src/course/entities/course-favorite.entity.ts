import { Entity, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';
import { Course } from './course.entity';

@Entity('course_favorite')
@Unique(['student', 'course'])
export class CourseFavorite extends BasicEntity {
    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'student_id' })
    student: User;

    @ManyToOne(() => Course, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_id' })
    course: Course;
}
