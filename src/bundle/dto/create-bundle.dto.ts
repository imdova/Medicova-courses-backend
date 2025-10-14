import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  ArrayNotEmpty,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BundleStatus } from '../entities/bundle.entity';
import { CurrencyCode } from '../entities/bundle-pricing.entity';

class BundlePricingDto {
  @ApiProperty({
    enum: CurrencyCode,
    description: 'Currency for the pricing (e.g., USD, EUR, EGP, SAR)',
    example: CurrencyCode.USD,
  })
  @IsEnum(CurrencyCode)
  currency_code: CurrencyCode;

  @ApiProperty({
    description: 'Regular price of the bundle in the given currency',
    example: 200,
  })
  @IsNumber()
  @Min(0)
  regular_price: number;

  @ApiPropertyOptional({
    description: 'Sale price if discount is applied',
    example: 150,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sale_price?: number;

  @ApiPropertyOptional({
    description: 'Discount amount to subtract from regular price',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_amount?: number;

  @ApiPropertyOptional({
    description: 'Whether discount is enabled',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  discount_enabled?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the pricing is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateBundleDto {
  @ApiProperty({
    description: 'Title of the bundle',
    example: 'Full Stack Developer Bundle',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Slug for SEO-friendly URLs',
    example: 'full-stack-developer-bundle',
  })
  @IsString()
  @MaxLength(255)
  slug: string;

  @ApiPropertyOptional({
    description: 'Description of the bundle',
    example: 'A curated collection of full stack development courses.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Thumbnail image URL',
    example: 'https://example.com/images/bundle-thumb.jpg',
  })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiProperty({
    description: 'Whether the bundle is free',
    example: false,
  })
  @IsBoolean()
  is_free: boolean;

  @ApiPropertyOptional({
    enum: BundleStatus,
    description: 'Current status of the bundle',
    example: BundleStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(BundleStatus)
  status?: BundleStatus;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Array of course UUIDs to include in the bundle',
    example: [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  courseIds: string[];

  @ApiProperty({
    type: [BundlePricingDto],
    description:
      'Array of pricing objects for the bundle in different currencies',
    example: [
      {
        currency_code: 'USD',
        regular_price: 200,
        sale_price: 150,
        discount_amount: 50,
        discount_enabled: true,
        is_active: true,
      },
      {
        currency_code: 'EUR',
        regular_price: 180,
      },
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BundlePricingDto)
  pricings: BundlePricingDto[];
}
