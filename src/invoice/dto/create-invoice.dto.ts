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
    IsPositive
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '../entities/invoice.entity';
import { AdditionalChargeType } from '../entities/additional-charge.entity';

export class InvoiceItemDto {
    @ApiProperty({
        description: 'Item description',
        example: 'Online Course: Advanced Web Development',
        examples: [
            'Online Course: React Masterclass',
            'Monthly Subscription: Premium Plan',
            'Consulting Services: 2 hours',
            'E-book: TypeScript Fundamentals',
            'Webinar: AI for Beginners'
        ]
    })
    @IsString()
    description: string;

    @ApiProperty({
        description: 'Unit price per item',
        example: 99.99,
        examples: [49.99, 199.99, 29.95, 499.00, 15.50]
    })
    @IsNumber()
    @Min(0)
    unitPrice: number;

    @ApiProperty({
        description: 'Quantity of items',
        example: 1,
        examples: [1, 2, 5, 10, 100],
        default: 1
    })
    @IsNumber()
    @Min(1)
    quantity: number = 1;

    @ApiPropertyOptional({
        description: 'Tax rate percentage (e.g., 15 for 15%)',
        example: 15,
        examples: [0, 5, 10, 15, 20],
        default: 0
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    taxRate?: number = 0;

    @ApiPropertyOptional({
        description: 'Discount percentage applied to this item (e.g., 10 for 10%)',
        example: 10,
        examples: [0, 5, 10, 15, 25, 50],
        default: 0
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    discountRate?: number = 0;
}

export class AdditionalChargeDto {
    @ApiProperty({
        description: 'Type of additional charge',
        enum: AdditionalChargeType,
        example: AdditionalChargeType.TAX,
        examples: [
            AdditionalChargeType.TAX,
            AdditionalChargeType.DISCOUNT,
            AdditionalChargeType.SHIPPING,
            AdditionalChargeType.FEE,
            AdditionalChargeType.OTHER
        ]
    })
    @IsEnum(AdditionalChargeType)
    type: AdditionalChargeType;

    @ApiProperty({
        description: 'Description of the charge',
        example: 'VAT Tax',
        examples: [
            'Early Payment Discount',
            'Shipping & Handling',
            'Service Fee',
            'Late Payment Penalty',
            'Promotional Discount'
        ]
    })
    @IsString()
    description: string;

    @ApiProperty({
        description: 'Amount (positive for charges, negative for discounts)',
        example: -50.00,
        examples: [15.00, -20.00, 5.99, -100.00, 10.50],
        type: Number
    })
    @IsNumber()
    amount: number;

    @ApiPropertyOptional({
        description: 'Percentage if this is a percentage-based charge (e.g., 15 for 15%)',
        example: 10,
        examples: [5, 10, 15, 20, 25],
        default: 0
    })
    @IsNumber()
    @Min(0)
    @IsOptional()
    percentage?: number = 0;

    @ApiPropertyOptional({
        description: 'Whether this charge is calculated as a percentage of the subtotal',
        example: true,
        examples: [true, false],
        default: false
    })
    @IsOptional()
    isPercentage?: boolean = false;
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
        example: [
            {
                description: 'Online Course: Web Development Fundamentals',
                unitPrice: 199.99,
                quantity: 1,
                taxRate: 15,
                discountRate: 10
            },
            {
                description: 'Monthly Platform Subscription',
                unitPrice: 29.99,
                quantity: 3,
                taxRate: 15,
                discountRate: 0
            }
        ],
        examples: [
            [
                { description: 'Consulting Services', unitPrice: 150, quantity: 5, taxRate: 10 },
                { description: 'Software License', unitPrice: 499, quantity: 1, discountRate: 15 }
            ],
            [
                { description: 'Premium Support Package', unitPrice: 99.99, quantity: 1 }
            ]
        ]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => InvoiceItemDto)
    items: InvoiceItemDto[];

    // Additional Charges (Discounts and Taxes)
    @ApiPropertyOptional({
        description: 'Additional charges, discounts, or fees applied to the invoice',
        type: [AdditionalChargeDto],
        example: [
            {
                type: AdditionalChargeType.DISCOUNT,
                description: 'Early Payment Discount',
                amount: -50.00,
                percentage: 10,
                isPercentage: true
            },
            {
                type: AdditionalChargeType.TAX,
                description: 'VAT Tax',
                amount: 75.00,
                percentage: 15,
                isPercentage: true
            }
        ],
        examples: [
            [
                { type: 'DISCOUNT', description: 'Promo Code', amount: -25.00 },
                { type: 'TAX', description: 'Sales Tax', amount: 19.99 }
            ],
            [
                { type: 'SHIPPING', description: 'Express Shipping', amount: 15.99 }
            ],
            []  // No additional charges
        ]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AdditionalChargeDto)
    @IsOptional()
    additionalCharges?: AdditionalChargeDto[];

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