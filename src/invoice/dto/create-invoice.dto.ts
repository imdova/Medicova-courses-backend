import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsString,
    IsEmail,
    IsNumber,
    IsOptional,
    IsDateString,
    IsUUID,
    Min,
    ValidateNested,
    IsArray,
    IsPhoneNumber,
    IsPositive,
    IsInt
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '../entities/invoice.entity';
import { InvoiceItemType } from '../entities/invoice-item.entity';

export class InvoiceItemDto {
    @ApiProperty({
        description: 'Type of item to add to cart',
        enum: InvoiceItemType
    })
    @IsEnum(InvoiceItemType)
    itemType: InvoiceItemType;

    @ApiProperty({
        description: 'ID of the course or bundle',
        format: 'uuid'
    })
    @IsUUID()
    itemId: string;

    @ApiProperty({
        description: 'Currency code for the item',
        enum: ['USD', 'EUR', 'EGP', 'SAR'],
        example: 'USD'
    })
    @IsString()
    currencyCode: string;

    @ApiProperty({
        description: 'Quantity of items',
        default: 1,
        minimum: 1
    })
    @IsInt()
    @Min(1)
    @IsOptional()
    quantity?: number = 1;
}


export class CreateInvoiceDto {
    // General
    @ApiProperty({
        description: 'Date when the invoice is issued (YYYY-MM-DD format)',
        example: '2024-01-15',
        examples: ['2024-01-15', '2024-02-28', '2024-03-01']
    })
    @IsDateString()
    invoiceDate: string;

    @ApiProperty({
        description: 'Date when payment is due (YYYY-MM-DD format)',
        example: '2024-02-15',
        examples: ['2024-01-30', '2024-02-28', '2024-03-15', '2024-04-01']
    })
    @IsDateString()
    dueDate: string;

    @ApiProperty({
        description: 'Type of payment arrangement',
        enum: PaymentType,
        example: PaymentType.ONE_TIME,
        examples: [
            PaymentType.ONE_TIME,
            PaymentType.RECURRING,
            PaymentType.INSTALLMENT
        ]
    })
    @IsEnum(PaymentType)
    paymentType: PaymentType;

    // From (Sender) Information
    @ApiProperty({
        description: 'Sender/Company name issuing the invoice',
        example: "Medicova Courses",
        examples: [
            "Madison's Current",
            "Tech Solutions Inc.",
            "Acme Corporation",
            "Global Services Ltd.",
            "Creative Agency XYZ"
        ]
    })
    @IsString()
    fromName: string;

    @ApiProperty({
        description: 'Sender email address',
        example: 'invoices@medicova.com',
        examples: [
            'contact@medicova.com',
            'billing@company.com',
            'accounts@example.org',
            'finance@business.net'
        ]
    })
    @IsEmail()
    fromEmail: string;

    @ApiProperty({
        description: 'Sender phone number',
        example: '+201234567890',
        examples: [
            '+1 (555) 123-4567',
            '+44 20 7123 4567',
            '+971 4 123 4567',
            '+966 11 123 4567'
        ]
    })
    @IsString()
    fromPhone: string;

    @ApiProperty({
        description: 'Sender physical address',
        example: '123 Education Street, Cairo, Egypt',
        examples: [
            '456 Business Avenue, New York, NY 10001',
            '789 Tech Park, San Francisco, CA 94107',
            '321 Innovation Drive, London, UK',
            '555 Commercial Road, Dubai, UAE'
        ]
    })
    @IsString()
    fromAddress: string;

    // To (Recipient) Information
    @ApiProperty({
        description: 'Recipient/Client name',
        example: 'Elder Home',
        examples: [
            'John Smith',
            'ABC Corporation',
            'Sarah Johnson Consulting',
            'Tech Startup LLC',
            'Global Enterprises Inc.'
        ]
    })
    @IsString()
    toName: string;

    @ApiProperty({
        description: 'Recipient email address',
        example: 'client@elderhome.com',
        examples: [
            'john.smith@email.com',
            'billing@abccorp.com',
            'sarah@consulting.com',
            'accounts@techstartup.com',
            'finance@globalenterprises.com'
        ]
    })
    @IsEmail()
    toEmail: string;

    @ApiPropertyOptional({
        description: 'Recipient phone number',
        example: '+201098765432',
        examples: [
            '+1 (555) 987-6543',
            '+44 20 7654 3210',
            '+971 4 987 6543',
            null  // Optional field
        ]
    })
    @IsString()
    @IsOptional()
    toPhone?: string;

    @ApiPropertyOptional({
        description: 'Recipient physical address',
        example: '456 Client Street, Alexandria, Egypt',
        examples: [
            '789 Client Avenue, Los Angeles, CA 90001',
            '321 Customer Road, Manchester, UK',
            '555 Business Center, Riyadh, Saudi Arabia',
            null  // Optional field
        ]
    })
    @IsString()
    @IsOptional()
    toAddress?: string;

    // Invoice Items
    @ApiProperty({
        description: 'List of items/products/services included in the invoice',
        type: [InvoiceItemDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceItemDto)
    items: InvoiceItemDto[];

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

    // Notes
    @ApiPropertyOptional({
        description: 'Additional notes or terms for the invoice',
        example: 'Payment due within 30 days. Late payments subject to 2% monthly interest.',
        examples: [
            'Thank you for your business!',
            'Please include invoice number with payment.',
            'Net 30 terms apply.',
            'All payments are non-refundable.',
            'For questions, contact billing@medicova.com'
        ]
    })
    @IsString()
    @IsOptional()
    notes?: string;
}