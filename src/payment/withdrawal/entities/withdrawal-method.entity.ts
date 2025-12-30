import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { Withdrawal } from './withdrawal.entity';

export enum ProcessingTimeUnit {
    MINUTES = 'MINUTES',
    HOURS = 'HOURS',
    DAYS = 'DAYS',
    BUSINESS_DAYS = 'BUSINESS_DAYS',
}

export enum WithdrawalMethodType {
    INSTAPAY = 'INSTAPAY',
    EWALLET = 'EWALLET',
    BANK_TRANSFER = 'BANK_TRANSFER',
    PAYPAL = 'PAYPAL',
    CASH_PICKUP = 'CASH_PICKUP',
    CRYPTO = 'CRYPTO',
}

@Entity('withdrawal_methods')
export class WithdrawalMethod extends BasicEntity {
    @ApiProperty({ description: 'Method name (e.g., "Instapay", "Vodafone Cash")' })
    @Column({ unique: true })
    name: string;

    @ApiProperty({ description: 'Method type', enum: WithdrawalMethodType })
    @Column({ type: 'enum', enum: WithdrawalMethodType })
    type: WithdrawalMethodType;

    @ApiProperty({ description: 'Is this method active?', default: true })
    @Column({ default: true })
    isActive: boolean;

    @ApiProperty({ description: 'Fee percentage', default: 0 })
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
    feePercentage: number;

    @ApiProperty({ description: 'Processing time value' })
    @Column({ type: 'int' })
    processingTime: number;

    @ApiProperty({ description: 'Processing time unit', enum: ProcessingTimeUnit })
    @Column({ type: 'enum', enum: ProcessingTimeUnit })
    processingTimeUnit: ProcessingTimeUnit;

    @ApiProperty({ description: 'Minimum withdrawal amount' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    minAmount: number;

    @ApiProperty({ description: 'Maximum withdrawal amount' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    maxAmount: number;

    @ApiProperty({ description: 'Icon/logo URL', nullable: true })
    @Column({ nullable: true })
    iconUrl?: string;

    @ApiProperty({ description: 'Description for users' })
    @Column({ type: 'text' })
    description: string;

    @ApiProperty({ description: 'Withdrawals using this method', type: () => [Withdrawal] })
    @OneToMany(() => Withdrawal, (withdrawal) => withdrawal.withdrawalMethod)
    withdrawals: Withdrawal[];
}