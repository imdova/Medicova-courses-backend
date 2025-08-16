import { Entity, ManyToOne, JoinColumn } from 'typeorm';
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

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;
}
