// transaction.entity.ts
import { BasicEntity } from '../../common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import { CartItem } from 'src/cart/entities/cart-item.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum TransactionStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    REFUNDED = 'REFUNDED',
    CANCELLED = 'CANCELLED'
}

@Entity('transactions')
@Index(['creatorId', 'status'])
@Index(['created_at']) // For time-based queries
export class Transaction extends BasicEntity {
    @ApiProperty({ description: 'Creator who earns from this sale', type: () => User })
    @ManyToOne(() => User)
    @JoinColumn({ name: 'creator_id' })
    creator: User;

    @ApiProperty({ description: 'Creator ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'creator_id' })
    creatorId: string;

    @ApiProperty({ description: 'Buyer who purchased', type: () => User })
    @ManyToOne(() => User)
    @JoinColumn({ name: 'buyer_id' })
    buyer: User;

    @ApiProperty({ description: 'Buyer ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'buyer_id' })
    buyerId: string;

    @ApiProperty({ description: 'Cart for this purchase', type: () => Cart })
    @ManyToOne(() => Cart)
    cart: Cart;

    @ApiProperty({ description: 'Cart ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'cart_id' })
    cartId: string;

    @ApiProperty({ description: 'Cart item sold', type: () => CartItem })
    @ManyToOne(() => CartItem)
    @JoinColumn({ name: 'cart_item_id' })
    cartItem: CartItem;

    @ApiProperty({ description: 'Cart item ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'cart_item_id' })
    cartItemId: string;

    @ApiProperty({ description: 'Payment that completed this transaction', type: () => Payment, nullable: true })
    @ManyToOne(() => Payment, { nullable: true })
    @JoinColumn({ name: 'payment_id' })
    payment?: Payment;

    @ApiProperty({ description: 'Payment ID', nullable: true })
    @Column({ nullable: true, name: 'payment_id' })
    paymentId?: string;

    @ApiProperty({ description: 'Transaction status', enum: TransactionStatus })
    @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
    status: TransactionStatus;

    @ApiProperty({ description: 'Amount earned by creator (after platform fee)' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @ApiProperty({ description: 'Currency' })
    @Column({ length: 3 })
    currency: string;

    @ApiProperty({ description: 'Platform fee percentage applied' })
    @Column({ type: 'decimal', precision: 5, scale: 2 })
    platformFeePercentage: number;

    @ApiProperty({ description: 'Platform fee amount' })
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    platformFeeAmount: number;

    @ApiProperty({ description: 'Total price paid by buyer' })
    @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
    totalPrice: number;

    @ApiProperty({ description: 'Item type (course/bundle)' })
    @Column()
    itemType: string;

    @ApiProperty({ description: 'Item ID' })
    @Column({ type: 'uuid' })
    itemId: string;

    @ApiProperty({ description: 'Item title' })
    @Column()
    itemTitle: string;

    @ApiProperty({ description: 'Quantity purchased' })
    @Column({ type: 'int', default: 1 })
    quantity: number;
}