import {
    Entity,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from 'typeorm';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { Course } from '../../entities/course.entity';
import { User } from 'src/user/entities/user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('course_community')
export class CourseCommunity extends BasicEntity {
    @ApiProperty({ description: 'Text content of the comment or reply' })
    @Column({ type: 'text' })
    content: string;

    @ApiPropertyOptional({ description: 'Number of likes' })
    @Column({ type: 'int', default: 0 })
    likeCount: number;

    @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Course, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'course_id' })
    course: Course;

    @ManyToOne(() => CourseCommunity, (c) => c.replies, {
        nullable: true,
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'parent_id' })
    parent?: CourseCommunity;

    @OneToMany(() => CourseCommunity, (c) => c.parent)
    replies: CourseCommunity[];
}
