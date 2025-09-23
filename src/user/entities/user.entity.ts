import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToOne, ManyToOne, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Profile } from 'src/profile/entities/profile.entity';
import { Academy } from 'src/academy/entities/academy.entity';
import { Exclude } from 'class-transformer';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { Role } from './roles.entity';

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

  @ManyToOne(() => Role, (role) => role.users)
  role: Role; // user inherits permissions via role

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

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  emailVerificationToken?: string;

  get permissions(): string[] {
    return this.role?.rolePermissions?.map(rp => rp.permission.name) || [];
  }
}


