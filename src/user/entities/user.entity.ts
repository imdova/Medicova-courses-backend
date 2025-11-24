import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToOne, ManyToOne, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Profile } from 'src/profile/entities/profile.entity';
import { Academy } from 'src/academy/entities/academy.entity';
import { Exclude } from 'class-transformer';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { Role } from './roles.entity';
import { IdentityVerification } from './identity-verification.entity';
import { FileUpload } from '../../file-upload/entities/file-upload.entity';

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

  @Column({ type: 'bigint', nullable: true })
  refreshTokenExpiresAt: number; // Store as timestamp (milliseconds)

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

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'bigint', nullable: true })
  passwordResetExpiresAt?: number;

  // 🟢 New Fields for Identity Verification
  @ApiProperty({ description: 'Has the user submitted and passed identity verification?', default: false })
  @Column({ default: false, name: 'is_identity_verified' })
  isIdentityVerified: boolean;

  @ApiProperty({
    description: 'Overall verification status (True if isEmailVerified AND isIdentityVerified OR manually set by admin)',
    default: false,
  })
  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean;

  // 🟢 One-to-One relationship to the current active identity verification submission
  @OneToOne(() => IdentityVerification, (iv) => iv.user, {
    nullable: true,
    cascade: true, // Optional: if you want to save the submission with the user
  })
  identityVerification?: IdentityVerification;

  // 🆕 Add files relationship
  @OneToMany(() => FileUpload, (fileUpload) => fileUpload.uploadedBy)
  fileUploads: FileUpload[];

  get permissions(): string[] {
    return this.role?.rolePermissions?.map(rp => rp.permission.name) || [];
  }
}


