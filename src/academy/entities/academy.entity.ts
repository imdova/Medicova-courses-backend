import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToMany } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { AcademyInstructor } from './academy-instructors.entity';

@Entity('academies')
export class Academy extends BasicEntity {
  @ApiProperty({
    description: 'Name of the academy',
    example: 'Tech Academy',
  })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ description: 'Description of the academy', nullable: true })
  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => User, (user) => user.academy)
  users: User[];

  @OneToMany(() => AcademyInstructor, (instructor) => instructor.academy)
  instructors: AcademyInstructor[];
}
