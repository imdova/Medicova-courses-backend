import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { OfferType, CouponStatus } from '../entities/coupon.entity';

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
}
