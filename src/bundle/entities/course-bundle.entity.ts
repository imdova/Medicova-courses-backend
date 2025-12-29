import { Entity, ManyToOne, JoinColumn, Index, Column } from 'typeorm';
import { Bundle } from './bundle.entity';
import { Course } from 'src/course/entities/course.entity';
import { BasicEntity } from '../../common/entities/basic.entity';

@Entity('course_bundle')
export class CourseBundle extends BasicEntity {
  @ManyToOne(() => Bundle, (bundle) => bundle.courseBundles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'bundle_id' })
  bundle: Bundle;

  @Index()
  @Column({ name: 'bundle_id', type: 'uuid' })
  bundleId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Index()
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;
}
