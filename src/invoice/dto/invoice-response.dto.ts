import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, PaymentType } from '../entities/invoice.entity';
import { AdditionalChargeType } from '../entities/additional-charge.entity';

export class InvoiceItemResponseDto {
    @ApiProperty({ description: 'Item ID', format: 'uuid' })
    id: string;

    @ApiProperty({ description: 'Description' })
    description: string;

    @ApiProperty({ description: 'Unit price' })
    unitPrice: number;

    @ApiProperty({ description: 'Quantity' })
    quantity: number;

    @ApiProperty({ description: 'Total price' })
    totalPrice: number;

    @ApiProperty({ description: 'Tax rate' })
    taxRate: number;

    @ApiProperty({ description: 'Tax amount' })
    taxAmount: number;

    @ApiProperty({ description: 'Discount rate' })
    discountRate: number;

    @ApiProperty({ description: 'Discount amount' })
    discountAmount: number;

    @ApiProperty({ description: 'Created at' })
    createdAt: Date;
}

export class AdditionalChargeResponseDto {
    @ApiProperty({ description: 'Charge ID', format: 'uuid' })
    id: string;

    @ApiProperty({ description: 'Charge type', enum: AdditionalChargeType })
    type: AdditionalChargeType;

    @ApiProperty({ description: 'Description' })
    description: string;

    @ApiProperty({ description: 'Amount' })
    amount: number;

    @ApiProperty({ description: 'Percentage' })
    percentage: number;

    @ApiProperty({ description: 'Is percentage based' })
    isPercentage: boolean;

    @ApiProperty({ description: 'Created at' })
    createdAt: Date;
}

export class InvoiceResponseDto {
    @ApiProperty({ description: 'Invoice ID', format: 'uuid' })
    id: string;

    @ApiProperty({ description: 'Invoice number' })
    invoiceNumber: string;

    @ApiProperty({ description: 'Status', enum: InvoiceStatus })
    status: InvoiceStatus;

    @ApiProperty({ description: 'Invoice date' })
    invoiceDate: Date;

    @ApiProperty({ description: 'Due date' })
    dueDate: Date;

    @ApiProperty({ description: 'Payment type', enum: PaymentType })
    paymentType: PaymentType;

    // From Information
    @ApiProperty({ description: 'From: Name' })
    fromName: string;

    @ApiProperty({ description: 'From: Email' })
    fromEmail: string;

    @ApiProperty({ description: 'From: Phone' })
    fromPhone: string;

    @ApiProperty({ description: 'From: Address' })
    fromAddress: string;

    // To Information
    @ApiProperty({ description: 'To: Name' })
    toName: string;

    @ApiProperty({ description: 'To: Email' })
    toEmail: string;

    @ApiPropertyOptional({ description: 'To: Phone' })
    toPhone?: string;

    @ApiPropertyOptional({ description: 'To: Address' })
    toAddress?: string;

    // Totals
    @ApiProperty({ description: 'Subtotal' })
    subtotal: number;

    @ApiProperty({ description: 'Total discount' })
    totalDiscount: number;

    @ApiProperty({ description: 'Total tax' })
    totalTax: number;

    @ApiProperty({ description: 'Total' })
    total: number;

    @ApiProperty({ description: 'Amount paid' })
    amountPaid: number;

    @ApiProperty({ description: 'Balance due' })
    balanceDue: number;

    // Relationships
    @ApiProperty({ description: 'Created by user ID', format: 'uuid' })
    createdBy: string;

    @ApiProperty({ description: 'Invoice items', type: [InvoiceItemResponseDto] })
    items: InvoiceItemResponseDto[];

    @ApiProperty({ description: 'Additional charges', type: [AdditionalChargeResponseDto] })
    additionalCharges: AdditionalChargeResponseDto[];

    @ApiPropertyOptional({ description: 'Notes' })
    notes?: string;

    @ApiProperty({ description: 'Created at' })
    createdAt: Date;

    @ApiProperty({ description: 'Updated at' })
    updatedAt: Date;

    // Calculated fields
    @ApiProperty({ description: 'Is overdue' })
    isOverdue: boolean;

    @ApiProperty({ description: 'Days until due' })
    daysUntilDue: number;

    @ApiProperty({ description: 'Creator name' })
    creatorName?: string;

    @ApiProperty({ description: 'Creator email' })
    creatorEmail?: string;
}