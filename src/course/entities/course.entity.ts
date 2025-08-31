import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CoursePricing } from '../course-pricing/entities/course-pricing.entity';
import { CourseMetadataDto } from '../dto/course-metadata.dto';
import { CourseSection } from '../course-section/entities/course-section.entity';
import { CourseStudent } from './course-student.entity';
import { CourseCategory } from 'src/course/course-category/entities/course-category.entity';
import { Academy } from 'src/academy/entities/academy.entity';

export enum CourseType {
  RECORDED = 'recorded',
  LIVE = 'live',
  OFFLINE = 'offline',
  HYBRID = 'hybrid',
}

export enum CourseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum DurationUnit {
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
}

export enum LectureFrequencyCount {
  ONCE = 'once',
  TWICE = 'twice',
  THREE_TIMES = 'three_times',
}

@Entity('courses')
export class Course extends BasicEntity {
  @ApiProperty({
    description: 'User ID of the teacher/admin who created the course',
    format: 'uuid',
  })
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ApiProperty({ description: 'Type of the course', enum: CourseType })
  @Column({ type: 'enum', enum: CourseType })
  type: CourseType;

  @ApiProperty({
    description: 'Difficulty level of the course',
    enum: CourseLevel,
    example: CourseLevel.BEGINNER,
  })
  @Column({ type: 'enum', enum: CourseLevel, nullable: true })
  level: CourseLevel;

  @ApiPropertyOptional({
    description: 'Tags for the course',
    type: [String],
    example: ['JavaScript', 'Backend', 'NestJS'],
  })
  @Column({ type: 'text', array: true, default: [] })
  tags: string[];

  @ApiProperty({
    description: 'Status of the course',
    enum: CourseStatus,
    default: CourseStatus.DRAFT,
  })
  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus;

  @ApiProperty({ description: 'Is the course active?', default: true })
  @Column({ default: true, name: 'isActive' })
  isActive: boolean;

  @ApiProperty({ description: 'Name of the course', maxLength: 255 })
  @Column({ length: 255 })
  name: string;

  @ApiPropertyOptional({
    description: 'Start date of the course',
    type: String,
    format: 'date',
  })
  @Column({ type: 'date', nullable: true, name: 'start_date' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date of the course',
    type: String,
    format: 'date',
  })
  @Column({ type: 'date', nullable: true, name: 'end_date' })
  endDate?: string;

  // Recorded-course-specific fields
  @ApiPropertyOptional({
    description: 'Block content access after course expiration?',
    default: false,
  })
  @Column({ default: false, name: 'block_content_after_expiration' })
  blockContentAfterExpiration: boolean;

  @ApiPropertyOptional({
    description: 'Allow students to repurchase the course?',
    default: false,
  })
  @Column({ default: false, name: 'allow_repurchase' })
  allowRepurchase: boolean;

  @ApiPropertyOptional({
    description: 'Offer discount on the course?',
    default: false,
  })
  @Column({ default: false, name: 'offer_discount' })
  offerDiscount: boolean;

  @ApiPropertyOptional({
    description: 'Send notification emails?',
    default: false,
  })
  @Column({ default: false, name: 'send_email' })
  sendEmail: boolean;

  // Live/Hybrid-specific fields
  @ApiPropertyOptional({
    description: 'Course duration value (Live/Hybrid only)',
  })
  @Column({ type: 'int', nullable: true, name: 'course_duration' })
  courseDuration?: number;

  @ApiPropertyOptional({
    description: 'Unit for course duration',
    enum: DurationUnit,
  })
  @Column({
    type: 'enum',
    enum: DurationUnit,
    nullable: true,
    name: 'course_duration_unit',
  })
  courseDurationUnit?: DurationUnit;

  @ApiPropertyOptional({
    description: 'Lecture frequency count (Live/Hybrid only)',
    enum: LectureFrequencyCount,
  })
  @Column({
    type: 'enum',
    enum: LectureFrequencyCount,
    nullable: true,
    name: 'lecture_frequency',
  })
  lectureFrequency?: LectureFrequencyCount;

  @ApiPropertyOptional({
    description: 'Unit for lecture frequency',
    enum: DurationUnit,
  })
  @Column({
    type: 'enum',
    enum: DurationUnit,
    nullable: true,
    name: 'lecture_frequency_unit',
  })
  lectureFrequencyUnit?: DurationUnit;

  @ApiPropertyOptional({ description: 'Number of lectures' })
  @Column({ type: 'int', nullable: true, name: 'number_of_lectures' })
  numberOfLectures?: number;

  @ApiPropertyOptional({ description: 'Total course hours' })
  @Column({ type: 'int', nullable: true, name: 'total_hours' })
  totalHours?: number;

  @ApiProperty({ description: 'Is the course free?', default: false })
  @Column({ default: false, name: 'is_course_free' })
  isCourseFree: boolean;

  @ApiPropertyOptional({
    description: 'URL or path for the course image',
    maxLength: 255,
  })
  @Column({ length: 255, name: 'course_image', nullable: true })
  courseImage?: string;

  @ApiPropertyOptional({
    description: 'URL or path for the preview video',
    maxLength: 255,
  })
  @Column({ length: 255, name: 'preview_video', nullable: true })
  previewVideo?: string;

  @ApiPropertyOptional({ type: () => CourseMetadataDto })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: CourseMetadataDto;

  @OneToMany(() => CoursePricing, (pricing) => pricing.course, {
    cascade: true,
  })
  pricings: CoursePricing[];

  @OneToMany(() => CourseSection, (section) => section.course, {
    cascade: true,
  })
  sections: CourseSection[];

  @OneToMany(() => CourseStudent, (cs) => cs.course)
  enrollments: CourseStudent[];

  @ManyToOne(() => CourseCategory, (category) => category.courses, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: CourseCategory;

  @ManyToOne(() => CourseCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subcategory_id' })
  subCategory?: CourseCategory;

  @ManyToOne(() => Academy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academy_id' })
  academy: Academy;

  @ApiPropertyOptional({
    description: 'List of academy instructor IDs associated with the course',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '770e8400-e29b-41d4-a716-446655440000',
    ],
  })
  @Column('uuid', {
    array: true,
    nullable: true,
    name: 'academy_instructor_ids',
  })
  academyInstructorIds?: string[];

  @ApiProperty({ description: 'Slug for SEO-friendly URLs' })
  @Column({ length: 255, unique: true })
  slug: string;
}
