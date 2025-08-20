import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToOne, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { InstructorProfile } from 'src/profile/instructor-profile/entities/instructor-profile.entity';
import { Academy } from 'src/academy/entities/academy.entity';

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
  ACCOUNT_ADMIN = 'account_admin',
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
  @Column()
  password: string;

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
    type: () => InstructorProfile,
    nullable: true,
  })
  @OneToOne(
    () => InstructorProfile,
    (instructorProfile) => instructorProfile.user,
  )
  instructorProfile: InstructorProfile;

  @ManyToOne(() => Academy, (academy) => academy.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  academy?: Academy;
}
