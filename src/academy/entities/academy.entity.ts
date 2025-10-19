import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToMany } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { AcademyInstructor } from './academy-instructors.entity';

export enum AcademyType {
  TRAINING_CENTER = 'Training Center',
  ACADEMY = 'Academy',
  COLLEGE = 'College',
  UNIVERSITY = 'University',
}

export enum AcademySize {
  SIZE_1_10 = '1-10',
  SIZE_11_50 = '11-50',
  SIZE_51_100 = '51-100',
  SIZE_101_500 = '101-500',
  SIZE_501_1000 = '501-1000',
  SIZE_1001_5000 = '1001-5000',
  SIZE_5000_PLUS = '5000+',
}


@Entity('academies')
export class Academy extends BasicEntity {
  @ApiProperty({
    description: 'User ID of the academy_admin who created the academy',
    format: 'uuid',
  })
  @Column({ type: 'uuid' })
  created_by: string;

  @ApiProperty({ description: 'Name of the academy', example: 'Tech Academy' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ description: 'Slug for SEO-friendly URLs', example: 'tech-academy' })
  @Column({ length: 255, unique: true })
  slug: string;

  @ApiProperty({ description: 'URL or path to the academy logo', nullable: true })
  @Column({ nullable: true })
  image?: string;

  @ApiProperty({ description: 'Cover banner image for the academy page', nullable: true })
  @Column({ nullable: true })
  cover?: string;

  @ApiProperty({ description: 'Short description of the academy', nullable: true })
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({ description: 'Detailed about section', nullable: true })
  @Column({ type: 'text', nullable: true })
  about?: string;

  @ApiProperty({
    description: 'Relevant keywords for academy domain',
    example: ['Tech', 'Coding', 'AI'],
  })
  @Column('simple-array', { nullable: true })
  keyWords?: string[];

  @Column({ type: 'enum', enum: AcademyType, nullable: true })
  type?: AcademyType;

  @Column({ type: 'enum', enum: AcademySize, nullable: true })
  size?: AcademySize;

  @ApiProperty({ description: 'Year the academy was founded', example: 2010, nullable: true })
  @Column({ type: 'int', nullable: true })
  foundedYear?: number;

  @ApiProperty({ description: 'Address of the academy', nullable: true })
  @Column({ nullable: true })
  address?: string;

  @ApiProperty({ description: 'City object with name and code', nullable: true })
  @Column({ type: 'json', nullable: true })
  city?: { name: string; code: string } | null;

  @ApiProperty({ description: 'Country object with name and code', nullable: true })
  @Column({ type: 'json', nullable: true })
  country?: { name: string; code: string } | null;

  @ApiProperty({ description: 'Registration email', nullable: true })
  @Column({ nullable: true })
  email?: string;

  @ApiProperty({ description: 'Public contact email', nullable: true })
  @Column({ nullable: true })
  contactEmail?: string;

  @ApiProperty({ description: 'Contact phone number', nullable: true })
  @Column({ nullable: true })
  phone?: string;

  @ApiProperty({ description: 'Social media links', type: Object, nullable: true })
  @Column({ type: 'json', nullable: true })
  socialLinks?: {
    website?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
    tiktok?: string | null;
    snapchat?: string | null;
    pinterest?: string | null;
    reddit?: string | null;
    discord?: string | null;
    telegram?: string | null;
    whatsapp?: string | null;
  };

  @ApiProperty({ description: 'Gallery images', example: ['img1.jpg', 'img2.jpg'], nullable: true })
  @Column('simple-array', { nullable: true })
  gallery?: string[];

  @ApiProperty({ description: 'Real enrolled student count', nullable: true })
  @Column({ type: 'int', nullable: true })
  studentsCount?: number;

  // @ApiProperty({ description: 'Custom fake student count', nullable: true })
  // @Column({ type: 'int', nullable: true })
  // fakeStudentsCount?: number;

  @ApiProperty({ description: 'Display real student count instead of fake', nullable: true })
  @Column({ default: true })
  displayRealStudentsCount?: boolean;

  @ApiProperty({ description: 'Whether academy is verified', nullable: true })
  @Column({ default: false })
  isVerified?: boolean;

  @ApiProperty({ description: 'Email verification status', nullable: true })
  @Column({ default: false })
  isEmailVerified?: boolean;

  @ApiProperty({ description: 'Phone verification status', nullable: true })
  @Column({ default: false })
  isPhoneVerified?: boolean;

  @ApiProperty({ description: 'Identity verification status', nullable: true })
  @Column({ default: false })
  isIdentityVerified?: boolean;

  @OneToMany(() => User, (user) => user.academy)
  users: User[];

  @OneToMany(() => AcademyInstructor, (instructor) => instructor.academy)
  instructors: AcademyInstructor[];
}
