// update-withdrawal-method.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
    IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsUrl, Min, Max
} from 'class-validator';
import { ProcessingTimeUnit, WithdrawalMethodType } from '../entities/withdrawal-method.entity';

export class UpdateWithdrawalMethodDto {
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ enum: WithdrawalMethodType, required: false })
    @IsOptional()
    @IsEnum(WithdrawalMethodType)
    type?: WithdrawalMethodType;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(100)
    feePercentage?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    processingTime?: number;

    @ApiProperty({ enum: ProcessingTimeUnit, required: false })
    @IsOptional()
    @IsEnum(ProcessingTimeUnit)
    processingTimeUnit?: ProcessingTimeUnit;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minAmount?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsNumber()
    @Min(0)
    maxAmount?: number;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUrl()
    iconUrl?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    description?: string;
}