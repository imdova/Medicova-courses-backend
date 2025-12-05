import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity';
import { InvoiceItem } from './invoice-item.entity';
import { AdditionalCharge, AdditionalChargeType } from './additional-charge.entity';

export enum InvoiceStatus {
    DRAFT = 'DRAFT',
    PENDING = 'PENDING',
    PAID = 'PAID',
    OVERDUE = 'OVERDUE',
    CANCELLED = 'CANCELLED',
    VOID = 'VOID'
}

export enum PaymentType {
    ONE_TIME = 'ONE_TIME',
    RECURRING = 'RECURRING',
    INSTALLMENT = 'INSTALLMENT'
}

@Entity('invoices')
@Index(['invoiceNumber'], { unique: true })
@Index(['createdBy', 'status'])
@Index(['dueDate'])
export class Invoice extends BasicEntity {
    @ApiProperty({ description: 'Unique invoice number', example: 'INV-2024-001' })
    @Column({ unique: true })
    invoiceNumber: string;

    @ApiProperty({ description: 'Invoice status', enum: InvoiceStatus })
    @Column({
        type: 'enum',
        enum: InvoiceStatus,
        default: InvoiceStatus.DRAFT
    })
    status: InvoiceStatus;

    @ApiProperty({ description: 'Invoice date' })
    @Column({ type: 'date' })
    invoiceDate: Date;

    @ApiProperty({ description: 'Due date' })
    @Column({ type: 'date' })
    dueDate: Date;

    @ApiProperty({ description: 'Payment type', enum: PaymentType })
    @Column({
        type: 'enum',
        enum: PaymentType,
        default: PaymentType.ONE_TIME
    })
    paymentType: PaymentType;

    // From (Sender) Information - Based on your form "Madison's Current"
    @ApiProperty({ description: 'From: Name', example: "Madison's Current" })
    @Column({ name: 'from_name' })
    fromName: string;

    @ApiProperty({ description: 'From: Email', example: 'contact@medicova.com' })
    @Column({ name: 'from_email' })
    fromEmail: string;

    @ApiProperty({ description: 'From: Phone', example: '+201234567890' })
    @Column({ name: 'from_phone' })
    fromPhone: string;

    @ApiProperty({ description: 'From: Address', example: '123 Education Street, Cairo, Egypt' })
    @Column({ type: 'text', name: 'from_address' })
    fromAddress: string;

    // To (Recipient) Information - Based on your form "Elder Home"
    @ApiProperty({ description: 'To: Name', example: 'Elder Home' })
    @Column({ name: 'to_name' })
    toName: string;

    @ApiProperty({ description: 'To: Email' })
    @Column({ name: 'to_email' })
    toEmail: string;

    @ApiPropertyOptional({ description: 'To: Phone' })
    @Column({ nullable: true, name: 'to_phone' })
    toPhone?: string;

    @ApiPropertyOptional({ description: 'To: Address' })
    @Column({ type: 'text', nullable: true, name: 'to_address' })
    toAddress?: string;

    // Totals
    @ApiProperty({ description: 'Subtotal amount (before discounts/taxes)' })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    subtotal: number;

    @ApiProperty({ description: 'Total discount amount' })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_discount' })
    totalDiscount: number;

    @ApiProperty({ description: 'Total tax amount' })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'total_tax' })
    totalTax: number;

    @ApiProperty({ description: 'Total amount' })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total: number;

    @ApiProperty({ description: 'Amount paid' })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'amount_paid' })
    amountPaid: number;

    @ApiProperty({ description: 'Balance due' })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'balance_due' })
    balanceDue: number;

    // Creator Reference
    @ApiProperty({ description: 'User who created the invoice', type: () => User })
    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    createdByUser: User;

    @ApiProperty({ description: 'Created by user ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'created_by' })
    createdBy: string;

    @ApiPropertyOptional({ description: 'Notes/terms' })
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // Relationships
    @ApiProperty({ description: 'Invoice items', type: () => [InvoiceItem] })
    @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
    items: InvoiceItem[];

    @ApiProperty({ description: 'Additional charges', type: () => [AdditionalCharge] })
    @OneToMany(() => AdditionalCharge, (charge) => charge.invoice, { cascade: true })
    additionalCharges: AdditionalCharge[];

    // Helper methods
    calculateTotals(): void {
        // Calculate items subtotal
        this.subtotal = this.items?.reduce((total, item) => {
            return total + (item.unitPrice * item.quantity);
        }, 0) || 0;

        // Calculate additional charges
        let discountTotal = 0;
        let taxTotal = 0;
        let otherCharges = 0;

        this.additionalCharges?.forEach(charge => {
            if (charge.type === AdditionalChargeType.DISCOUNT) {
                discountTotal += charge.amount;
            } else if (charge.type === AdditionalChargeType.TAX) {
                taxTotal += charge.amount;
            } else {
                otherCharges += charge.amount;
            }
        });

        this.totalDiscount = Math.abs(discountTotal);
        this.totalTax = taxTotal;

        this.total = this.subtotal + otherCharges - Math.abs(discountTotal) + taxTotal;
        this.balanceDue = this.total - this.amountPaid;
    }

    isOverdue(): boolean {
        return new Date() > this.dueDate && this.status === InvoiceStatus.PENDING;
    }

    markAsPaid(amount: number = this.total): void {
        this.status = InvoiceStatus.PAID;
        this.amountPaid = amount;
        this.balanceDue = this.total - amount;
    }
}