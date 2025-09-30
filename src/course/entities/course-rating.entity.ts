import { BasicEntity } from "src/common/entities/basic.entity";
import { Column, Entity, JoinColumn, ManyToOne, Unique } from "typeorm";
import { Course } from "./course.entity";
import { User } from "src/user/entities/user.entity";

@Entity('course_ratings')
@Unique(['course', 'user']) // enforce uniqueness on relation level
export class CourseRating extends BasicEntity {
    @Column({ type: 'int' })
    rating: number; // 1–5

    @Column({ type: 'text', nullable: true })
    review?: string;

    @ManyToOne(() => Course, (course) => course.ratings, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}
