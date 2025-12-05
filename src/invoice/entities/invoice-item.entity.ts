import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem extends BasicEntity {
    @ApiProperty({ description: 'Invoice', type: () => Invoice })
    @ManyToOne(() => Invoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    @ApiProperty({ description: 'Invoice ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'invoice_id' })
    invoiceId: string;

    @ApiProperty({ description: 'Item description' })
    @Column()
    description: string;

    @ApiProperty({ description: 'Unit price' })
    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'unit_price' })
    unitPrice: number;

    @ApiProperty({ description: 'Quantity', default: 1 })
    @Column({ type: 'int', default: 1 })
    quantity: number;

    @ApiProperty({ description: 'Total price (unitPrice * quantity)' })
    @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_price' })
    totalPrice: number;

    @ApiPropertyOptional({ description: 'Tax rate percentage', default: 0 })
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'tax_rate' })
    taxRate: number;

    @ApiPropertyOptional({ description: 'Tax amount', default: 0 })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'tax_amount' })
    taxAmount: number;

    @ApiPropertyOptional({ description: 'Discount percentage', default: 0 })
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'discount_rate' })
    discountRate: number;

    @ApiPropertyOptional({ description: 'Discount amount', default: 0 })
    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, name: 'discount_amount' })
    discountAmount: number;

    // Calculate item totals
    calculateTotals(): void {
        const itemTotal = this.unitPrice * this.quantity;
        this.discountAmount = itemTotal * (this.discountRate / 100);
        const afterDiscount = itemTotal - this.discountAmount;
        this.taxAmount = afterDiscount * (this.taxRate / 100);
        this.totalPrice = afterDiscount + this.taxAmount;
    }
}