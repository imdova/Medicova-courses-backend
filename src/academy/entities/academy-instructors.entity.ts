import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Academy } from 'src/academy/entities/academy.entity';

@Entity()
export class AcademyInstructor extends BasicEntity {
  @ApiProperty({ description: 'Full name of the teacher' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Photo URL of the teacher', required: false })
  @Column({ nullable: true })
  photoUrl?: string;

  @ApiProperty({ description: 'Biography of the teacher', required: false })
  @Column({ type: 'text', nullable: true })
  biography?: string;

  @ManyToOne(() => Academy, (academy) => academy.instructors, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  academy: Academy;
}
