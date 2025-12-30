// src/payment/entities/withdrawal/withdrawal.entity.ts
import { BasicEntity } from '../../../common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { WithdrawalMethod } from './withdrawal-method.entity';

export enum WithdrawalStatus {
    PENDING = 'PENDING',
    UNDER_REVIEW = 'UNDER_REVIEW',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
    REJECTED = 'REJECTED',
}

@Entity('withdrawals')
@Index(['creatorId', 'status'])
@Index(['status', 'created_at'])
@Index(['withdrawalMethodId', 'status'])
export class Withdrawal extends BasicEntity {
    @ApiProperty({ description: 'Creator requesting withdrawal', type: () => User })
    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'creator_id' })
    creator: User;

    @ApiProperty({ description: 'Creator ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'creator_id' })
    creatorId: string;

    @ApiProperty({ description: 'Withdrawal method', type: () => WithdrawalMethod })
    @ManyToOne(() => WithdrawalMethod, { eager: true })
    @JoinColumn({ name: 'withdrawal_method_id' })
    withdrawalMethod: WithdrawalMethod;

    @ApiProperty({ description: 'Withdrawal method ID' })
    @Column({ name: 'withdrawal_method_id' })
    withdrawalMethodId: string;

    @ApiProperty({ description: 'Withdrawal status', enum: WithdrawalStatus })
    @Column({ type: 'enum', enum: WithdrawalStatus, default: WithdrawalStatus.PENDING })
    status: WithdrawalStatus;

    @ApiProperty({ description: 'Withdrawal amount' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @ApiProperty({ description: 'Currency' })
    @Column({ length: 3 })
    currency: string;

    @ApiProperty({ description: 'Processing fee' })
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    processingFee: number;

    @ApiProperty({ description: 'Net amount received (amount - fee)' })
    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'net_amount' })
    netAmount: number;

    @ApiProperty({
        description: 'Payment metadata (varies by method)',
        example: {
            // Instapay/E-Wallet
            phoneNumber: '+201012345678',

            // Bank Transfer (National)
            bankName: 'CIB',
            accountNumber: '123456789',
            accountHolderName: 'John Doe',

            // Bank Transfer (International)
            iban: 'EG12345678901234567890123456',
            swiftCode: 'BUCBEGCX',
            country: 'Egypt',

            // PayPal
            email: 'creator@example.com',

            // Crypto
            walletAddress: '0x123...',
            network: 'Ethereum',
        }
    })
    @Column({ type: 'json', nullable: true })
    metadata: Record<string, any>;

    // Admin processing fields
    @ApiProperty({ description: 'Admin who processed', type: () => User, nullable: true })
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'processed_by' })
    processedBy?: User;

    @ApiProperty({ description: 'Processed by ID', nullable: true })
    @Column({ type: 'uuid', nullable: true, name: 'processed_by' })
    processedById?: string;

    @ApiProperty({ description: 'Processing notes', nullable: true })
    @Column({ type: 'text', nullable: true })
    processingNotes?: string;

    @ApiProperty({ description: 'Rejection reason', nullable: true })
    @Column({ type: 'text', nullable: true })
    rejectionReason?: string;

    @ApiProperty({ description: 'Processed date', nullable: true })
    @Column({ type: 'timestamp', nullable: true })
    processedAt?: Date;

    @ApiProperty({ description: 'Gateway transaction ID', nullable: true })
    @Column({ nullable: true })
    gatewayTransactionId?: string;

    @ApiProperty({ description: 'Gateway response', nullable: true })
    @Column({ type: 'json', nullable: true })
    gatewayResponse?: Record<string, any>;

    @ApiProperty({ description: 'Admin can add internal notes', nullable: true })
    @Column({ type: 'text', nullable: true })
    adminInternalNotes?: string;
}