import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { OfferType, CouponStatus, CouponApplicability } from '../entities/coupon.entity';

export class CreateCouponDto {
  @ApiProperty({ description: 'Coupon name', example: 'Summer Sale 2025' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Unique alphanumeric coupon code',
    example: 'SUMMER25',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Type of discount',
    enum: OfferType,
    example: OfferType.PERCENTAGE,
  })
  @IsEnum(OfferType)
  offer_type: OfferType;

  @ApiProperty({ description: 'Discount amount', example: 25.0 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Minimum purchase required',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  minimum_purchase?: number;

  @ApiPropertyOptional({
    description: 'Usage limit (null = unlimited)',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  usage_limit?: number;

  @ApiPropertyOptional({
    description: 'Start date (YYYY-MM-DD)',
    example: '2025-08-01',
  })
  @IsOptional()
  start_date?: Date;

  @ApiPropertyOptional({
    description: 'End date (YYYY-MM-DD)',
    example: '2025-08-31',
  })
  @IsOptional()
  end_date?: Date;

  @ApiPropertyOptional({
    description: 'Coupon status',
    enum: CouponStatus,
    default: CouponStatus.INACTIVE,
  })
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @ApiProperty({
    description: 'Defines how the coupon is applied',
    enum: CouponApplicability,
  })
  @IsEnum(CouponApplicability)
  applicable_for: CouponApplicability;

  @ApiPropertyOptional({
    description: 'Array of selected course IDs (required when applicable_for = MULTIPLE_COURSES)',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '660e8400-e29b-41d4-a716-446655440000',
    ],
  })
  @ValidateIf(o => o.applicable_for === CouponApplicability.MULTIPLE_COURSES)
  @IsArray()
  @IsNotEmpty({
    message:
      'course_ids must be provided when applicable_for is MULTIPLE_COURSES',
  })
  course_ids?: string[];

  @ApiPropertyOptional({
    description: 'Category ID (required when applicable_for = CATEGORY_COURSES)',
    example: '770e8400-e29b-41d4-a716-446655440000',
  })
  @ValidateIf(o => o.applicable_for === CouponApplicability.CATEGORY_COURSES)
  @IsString()
  category_id?: string;

  @ApiPropertyOptional({
    description:
      'Subcategory ID (required when applicable_for = SUBCATEGORY_COURSES)',
    example: '880e8400-e29b-41d4-a716-446655440000',
  })
  @ValidateIf(o => o.applicable_for === CouponApplicability.SUBCATEGORY_COURSES)
  @IsString()
  subcategory_id?: string;
}
