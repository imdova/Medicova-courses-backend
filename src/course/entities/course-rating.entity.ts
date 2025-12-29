import { BasicEntity } from "src/common/entities/basic.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { Course } from "./course.entity";
import { User } from "src/user/entities/user.entity";

export enum CourseRatingStatus {
    PUBLISHED = 'published',
    DRAFT = 'draft',
    REJECTED = 'rejected',
}

@Entity('course_ratings')
@Unique(['course', 'user']) // enforce uniqueness on relation level
export class CourseRating extends BasicEntity {
    @Column({ type: 'int' })
    rating: number; // 1–5

    @Column({ type: 'text', nullable: true })
    review?: string;

    @Column({ type: 'simple-array', nullable: true })
    images?: string[]; // optional array of image URLs or paths

    @Index()
    @Column({
        type: 'enum',
        enum: CourseRatingStatus,
        default: CourseRatingStatus.DRAFT,
    })
    status: CourseRatingStatus;

    @ManyToOne(() => User, (user) => user.enrollments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => Course, (course) => course.enrollments, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @Index()
    @Column({ name: 'course_id', type: 'uuid' })
    courseId: string;
}
