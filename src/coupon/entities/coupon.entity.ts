import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OfferType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
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
  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.INACTIVE })
  status: CouponStatus;
}
