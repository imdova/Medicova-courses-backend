import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { CurrencyCode } from '../entities/course-pricing.entity';

export class CreateCoursePricingDto {
  @ApiProperty({
    enum: CurrencyCode,
    description: 'Currency code for the price',
  })
  @IsEnum(CurrencyCode)
  currencyCode: CurrencyCode;

  @ApiProperty({ description: 'Regular price of the course', minimum: 0 })
  @IsNumber()
  @Min(0)
  regularPrice: number;

  @ApiPropertyOptional({ description: 'Sale price if applicable' })
  @IsNumber()
  @IsOptional()
  salePrice?: number;

  @ApiPropertyOptional({ description: 'Discount amount applied' })
  @IsNumber()
  @IsOptional()
  discountAmount?: number;

  @ApiProperty({ description: 'Flag to enable or disable discount' })
  @IsBoolean()
  discountEnabled: boolean;

  @ApiProperty({ description: 'Flag to mark if the pricing is active' })
  @IsBoolean()
  isActive: boolean;
}
