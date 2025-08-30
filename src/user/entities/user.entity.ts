import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToOne, ManyToOne, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Profile } from 'src/profile/entities/profile.entity';
import { Academy } from 'src/academy/entities/academy.entity';
import { Exclude } from 'class-transformer';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { Payment } from 'src/payment/entities/payment.entity';

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
  ACADEMY_ADMIN = 'academy_admin', // Adds users to academy
  ACADEMY_USER = 'academy_user', // Can do anything the admin can, but admin can take away from him
}

@Entity()
export class User extends BasicEntity {
  @ApiProperty({
    description: 'Unique email address of the user',
    example: 'jane.doe@example.com',
  })
  @Column({ unique: true, nullable: false })
  email: string;

  @ApiProperty({
    description: 'Hashed password of the user',
    example: '$2b$10$somehashedpasswordstring',
  })
  @Exclude()
  @Column()
  password: string;

  @Exclude()
  @Column({ name: 'refresh_token', nullable: true })
  refreshToken?: string;

  @ApiProperty({
    description: 'Role assigned to the user',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  @ApiProperty({
    description: 'Associated instructor profile details of the user',
    type: () => Profile,
    nullable: true,
  })
  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;

  @ManyToOne(() => Academy, (academy) => academy.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  academy?: Academy;

  @OneToMany(() => CourseStudent, (cs) => cs.student)
  enrollments: CourseStudent[];

  @OneToMany(() => Payment, (payment) => payment.user)
  payments: Payment[];
}
