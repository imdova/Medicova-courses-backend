import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsString,
    IsEmail,
    IsNumber,
    IsOptional,
    IsDateString,
    Min,
    ValidateNested,
    IsArray
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, PaymentType } from '../entities/invoice.entity';
import { AdditionalChargeType } from '../entities/additional-charge.entity';

export class UpdateInvoiceItemDto {
    @ApiPropertyOptional({ description: 'Item description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Unit price' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    unitPrice?: number;

    @ApiPropertyOptional({ description: 'Quantity' })
    @IsNumber()
    @Min(1)
    @IsOptional()
    quantity?: number;

    @ApiPropertyOptional({ description: 'Tax rate percentage' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    taxRate?: number;

    @ApiPropertyOptional({ description: 'Discount percentage' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    discountRate?: number;
}

export class UpdateAdditionalChargeDto {
    @ApiPropertyOptional({ description: 'Charge type', enum: AdditionalChargeType })
    @IsEnum(AdditionalChargeType)
    @IsOptional()
    type?: AdditionalChargeType;

    @ApiPropertyOptional({ description: 'Description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Amount' })
    @IsNumber()
    @IsOptional()
    amount?: number;

    @ApiPropertyOptional({ description: 'Percentage' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    percentage?: number;

    @ApiPropertyOptional({ description: 'Is percentage based?' })
    @IsOptional()
    isPercentage?: boolean;
}

export class UpdateInvoiceDto {
    @ApiPropertyOptional({ description: 'Invoice date' })
    @IsDateString()
    @IsOptional()
    invoiceDate?: string;

    @ApiPropertyOptional({ description: 'Due date' })
    @IsDateString()
    @IsOptional()
    dueDate?: string;

    @ApiPropertyOptional({ description: 'Payment type', enum: PaymentType })
    @IsEnum(PaymentType)
    @IsOptional()
    paymentType?: PaymentType;

    @ApiPropertyOptional({ description: 'Status', enum: InvoiceStatus })
    @IsEnum(InvoiceStatus)
    @IsOptional()
    status?: InvoiceStatus;

    // From Information
    @ApiPropertyOptional({ description: 'From: Name' })
    @IsString()
    @IsOptional()
    fromName?: string;

    @ApiPropertyOptional({ description: 'From: Email' })
    @IsEmail()
    @IsOptional()
    fromEmail?: string;

    @ApiPropertyOptional({ description: 'From: Phone' })
    @IsString()
    @IsOptional()
    fromPhone?: string;

    @ApiPropertyOptional({ description: 'From: Address' })
    @IsString()
    @IsOptional()
    fromAddress?: string;

    // To Information
    @ApiPropertyOptional({ description: 'To: Name' })
    @IsString()
    @IsOptional()
    toName?: string;

    @ApiPropertyOptional({ description: 'To: Email' })
    @IsEmail()
    @IsOptional()
    toEmail?: string;

    @ApiPropertyOptional({ description: 'To: Phone' })
    @IsString()
    @IsOptional()
    toPhone?: string;

    @ApiPropertyOptional({ description: 'To: Address' })
    @IsString()
    @IsOptional()
    toAddress?: string;

    // Items and Charges
    @ApiPropertyOptional({ description: 'Invoice items', type: [UpdateInvoiceItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateInvoiceItemDto)
    @IsOptional()
    items?: UpdateInvoiceItemDto[];

    @ApiPropertyOptional({ description: 'Additional charges', type: [UpdateAdditionalChargeDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateAdditionalChargeDto)
    @IsOptional()
    additionalCharges?: UpdateAdditionalChargeDto[];

    @ApiPropertyOptional({ description: 'Notes' })
    @IsString()
    @IsOptional()
    notes?: string;

    @ApiPropertyOptional({ description: 'Amount paid' })
    @IsNumber()
    @Min(0)
    @IsOptional()
    amountPaid?: number;
}