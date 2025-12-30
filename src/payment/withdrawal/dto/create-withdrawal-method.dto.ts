import { ApiProperty } from '@nestjs/swagger';
import {
    IsString, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested,
    IsOptional, IsUrl, Min, Max
} from 'class-validator';
import { ProcessingTimeUnit, WithdrawalMethodType } from '../entities/withdrawal-method.entity';

export class CreateWithdrawalMethodDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ enum: WithdrawalMethodType })
    @IsEnum(WithdrawalMethodType)
    type: WithdrawalMethodType;

    @ApiProperty({ required: false, default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @ApiProperty({ required: false, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    feePercentage?: number = 0;

    @ApiProperty()
    @IsNumber()
    processingTime: number;

    @ApiProperty({ enum: ProcessingTimeUnit })
    @IsEnum(ProcessingTimeUnit)
    processingTimeUnit: ProcessingTimeUnit;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    minAmount: number;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    maxAmount: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUrl()
    iconUrl?: string;

    @ApiProperty()
    @IsString()
    description: string;
}