import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('course_note')
export class CourseNote extends BasicEntity {
    @ApiProperty({ description: 'Title of the note' })
    @Column({ length: 255 })
    title: string;

    @ApiProperty({ description: 'Content or body of the note' })
    @Column({ type: 'text' })
    description: string;

    @ManyToOne(() => CourseStudent, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_student_id' })
    courseStudent: CourseStudent;
}
