import { ApiProperty } from '@nestjs/swagger';
import {
    IsString, IsNumber, IsBoolean, IsEnum, IsArray, ValidateNested,
    IsOptional, IsUrl, Min, Max
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProcessingTimeUnit, WithdrawalMethodType } from '../entities/withdrawal-method.entity';

class RequiredFieldDto {
    @ApiProperty()
    @IsString()
    field: string;

    @ApiProperty()
    @IsString()
    label: string;

    @ApiProperty({ enum: ['text', 'number', 'email', 'phone', 'select'] })
    @IsString()
    type: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    placeholder?: string;

    @ApiProperty({ type: () => [Object], required: false })
    @IsOptional()
    @IsArray()
    options?: Array<{ label: string; value: string }>;

    @ApiProperty({ required: false })
    @IsOptional()
    validation?: {
        required?: boolean;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
    };
}

export class CreateWithdrawalMethodDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ enum: WithdrawalMethodType })
    @IsEnum(WithdrawalMethodType)
    type: WithdrawalMethodType;

    @ApiProperty()
    @IsString()
    code: string;

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

    @ApiProperty({ required: false, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    minFee?: number = 0;

    @ApiProperty({ required: false, default: 0 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    fixedFee?: number = 0;

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

    @ApiProperty({ required: false, default: 'EGP' })
    @IsOptional()
    @IsString()
    currency?: string = 'EGP';

    @ApiProperty({ required: false, default: 'EGP' })
    @IsOptional()
    @IsString()
    supportedCurrencies?: string = 'EGP';

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUrl()
    iconUrl?: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    instructions?: string;

    @ApiProperty({ type: () => [RequiredFieldDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RequiredFieldDto)
    requiredFields: RequiredFieldDto[];

    @ApiProperty({ required: false, default: 0 })
    @IsOptional()
    @IsNumber()
    sortOrder?: number = 0;
}