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
    IsArray,
    IsInt,
    IsUUID
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus, PaymentType } from '../entities/invoice.entity';
import { InvoiceItemType } from '../entities/invoice-item.entity';

export class UpdateInvoiceItemDto {
    @ApiPropertyOptional({
        description: 'Type of item to add to cart',
        enum: InvoiceItemType
    })
    @IsEnum(InvoiceItemType)
    @IsOptional()
    itemType: InvoiceItemType;

    @ApiPropertyOptional({
        description: 'ID of the course or bundle',
        format: 'uuid'
    })
    @IsUUID()
    @IsOptional()
    itemId: string;

    @ApiPropertyOptional({
        description: 'Currency code for the item',
        enum: ['USD', 'EUR', 'EGP', 'SAR'],
        example: 'USD'
    })
    @IsString()
    @IsOptional()
    currencyCode: string;

    @ApiPropertyOptional({
        description: 'Quantity of items',
        default: 1,
        minimum: 1
    })
    @IsInt()
    @Min(1)
    @IsOptional()
    quantity?: number = 1;
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

    @ApiPropertyOptional({
        description: 'Overall discount rate percentage for the invoice',
        example: '5',
    })
    @IsNumber()
    @IsOptional()
    discountRate?: number;

    @ApiPropertyOptional({
        description: 'Overall tax rate percentage for the invoice',
        example: '5',
    })
    @IsNumber()
    @IsOptional()
    taxRate?: number;

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