import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum RevenuePeriod {
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    YEARLY = 'yearly'
}

export class RevenueGrowthDto {
    @ApiProperty({
        description: 'Time period for revenue aggregation',
        enum: RevenuePeriod,
        default: RevenuePeriod.MONTHLY
    })
    @IsEnum(RevenuePeriod)
    @IsOptional()
    period?: RevenuePeriod = RevenuePeriod.MONTHLY;

    @ApiProperty({
        description: 'Currency code to filter by (e.g., EGP, USD). Leave empty for all currencies',
        required: false
    })
    @IsString()
    @IsOptional()
    currency?: string;

    @ApiProperty({
        description: 'Number of periods to go back (e.g., 12 for yearly, 6 for monthly)',
        required: false,
        default: 12
    })
    @IsOptional()
    periods?: number = 12;
}