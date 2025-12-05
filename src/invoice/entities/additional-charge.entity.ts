import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Invoice } from './invoice.entity';

export enum AdditionalChargeType {
    DISCOUNT = 'DISCOUNT',
    TAX = 'TAX',
    SHIPPING = 'SHIPPING',
    FEE = 'FEE',
    OTHER = 'OTHER'
}

@Entity('additional_charges')
export class AdditionalCharge extends BasicEntity {
    @ApiProperty({ description: 'Invoice', type: () => Invoice })
    @ManyToOne(() => Invoice, (invoice) => invoice.additionalCharges, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    @ApiProperty({ description: 'Invoice ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'invoice_id' })
    invoiceId: string;

    @ApiProperty({ description: 'Charge type', enum: AdditionalChargeType })
    @Column({ type: 'enum', enum: AdditionalChargeType })
    type: AdditionalChargeType;

    @ApiProperty({ description: 'Description' })
    @Column()
    description: string;

    @ApiProperty({ description: 'Amount (negative for discounts)' })
    @Column({ type: 'decimal', precision: 12, scale: 2 })
    amount: number;

    @ApiProperty({ description: 'Percentage if percentage-based' })
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    percentage: number;

    @ApiProperty({ description: 'Is this charge applied as a percentage?', default: false })
    @Column({ default: false, name: 'is_percentage' })
    isPercentage: boolean;
}