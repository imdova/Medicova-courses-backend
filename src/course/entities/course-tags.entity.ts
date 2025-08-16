import { Entity, Column } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from '../../common/entities/basic.entity';

@Entity('course_tags')
export class CourseTag extends BasicEntity {
  @ApiProperty({ description: 'Tag name', example: 'NestJS' })
  @Column({ length: 50, unique: true })
  name: string;
}
