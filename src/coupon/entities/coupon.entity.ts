import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourseCategory } from 'src/course/course-category/entities/course-category.entity';

export enum OfferType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

export enum CouponApplicability {
  MULTIPLE_COURSES = 'MULTIPLE_COURSES',
  CATEGORY_COURSES = 'CATEGORY_COURSES',
  SUBCATEGORY_COURSES = 'SUBCATEGORY_COURSES',
  ALL_INSTRUCTOR_COURSES = 'ALL_INSTRUCTOR_COURSES',
  ALL_PLATFORM_COURSES = 'ALL_PLATFORM_COURSES', // (for admin)
}

@Entity('coupons')
export class Coupon extends BasicEntity {
  @ApiProperty({
    description: 'Coupon name (max 255 characters)',
    example: 'Summer Sale 2025',
  })
  @Column({ length: 255 })
  name: string;

  @ApiProperty({
    description: 'User ID of the teacher/admin who created the coupon',
    format: 'uuid',
  })
  @Index()
  @Column({ type: 'uuid' })
  created_by: string;

  @ApiProperty({
    description: 'Unique alphanumeric coupon code',
    example: 'SUMMER25',
  })
  @Column({ unique: true })
  code: string;

  @ApiProperty({
    description: 'Type of discount (Percentage or Flat)',
    enum: OfferType,
    example: OfferType.PERCENTAGE,
  })
  @Column({ type: 'enum', enum: OfferType })
  offer_type: OfferType;

  @ApiProperty({
    description: 'Discount amount (2 decimal places)',
    example: 25.0,
  })
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @ApiPropertyOptional({
    description: 'Minimum purchase amount required to apply coupon',
    example: 100.0,
  })
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  minimum_purchase: number | null;

  @ApiPropertyOptional({
    description:
      'Maximum number of times this coupon can be used (null = unlimited)',
    example: 50,
  })
  @Column({ type: 'int', nullable: true })
  usage_limit: number | null;

  @ApiPropertyOptional({
    description: 'Coupon start date (optional)',
    example: '2025-08-01',
  })
  @Column({ type: 'date', nullable: true })
  start_date: Date | null;

  @ApiPropertyOptional({
    description: 'Coupon end date (optional)',
    example: '2025-08-31',
  })
  @Column({ type: 'date', nullable: true })
  end_date: Date | null;

  @ApiProperty({
    description: 'Current coupon status',
    enum: CouponStatus,
    example: CouponStatus.ACTIVE,
    default: CouponStatus.INACTIVE,
  })
  @Index()
  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.INACTIVE })
  status: CouponStatus;

  @ApiProperty({
    description: 'Defines which courses this coupon applies to',
    enum: CouponApplicability,
    example: CouponApplicability.MULTIPLE_COURSES,
  })
  @Index()
  @Column({
    type: 'enum',
    enum: CouponApplicability,
    name: 'applicable_for',
  })
  applicable_for: CouponApplicability;

  @Column('uuid', { array: true, nullable: true })
  course_ids: string[] | null;

  // ✅ NEW COLUMN: Academy ID
  @ApiPropertyOptional({
    description: 'ID of the Academy this coupon belongs to (if created by an Academy Admin/User)',
    format: 'uuid',
  })
  @Index()
  @Column({ type: 'uuid', nullable: true })
  academy_id: string | null;

  @ApiPropertyOptional({
    description: 'Category ID for category-based coupons',
    format: 'uuid',
  })
  @Index()
  @Column({ type: 'uuid', name: 'category_id', nullable: true })
  category_id: string | null;

  @ApiPropertyOptional({
    description: 'Subcategory ID for subcategory-based coupons',
    format: 'uuid',
  })
  @Index()
  @Column({ type: 'uuid', name: 'subcategory_id', nullable: true })
  subcategory_id: string | null;

  // In Coupon entity - add these relations
  @ManyToOne(() => CourseCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: CourseCategory;

  @ManyToOne(() => CourseCategory, { nullable: true })
  @JoinColumn({ name: 'subcategory_id' })
  subcategory: CourseCategory;
}
