// cart.entity.ts
import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity';
import { CartItem } from './cart-item.entity';
import { Payment } from 'src/payment/entities/payment.entity';
import { Transaction } from 'src/payment/entities/transaction.entity';


export enum CartStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    ABANDONED = 'abandoned',
    CANCELLED = 'cancelled'
}

@Entity('carts')
export class Cart extends BasicEntity {
    @ManyToOne(() => User, { eager: false })
    @JoinColumn({ name: 'created_by' })
    user: User;

    @ApiProperty({ description: 'User ID who owns the cart', format: 'uuid' })
    @Column({ type: 'uuid', name: 'created_by' })
    createdBy: string;

    @ApiProperty({
        description: 'Status of the cart',
        enum: CartStatus,
        default: CartStatus.ACTIVE
    })
    @Column({
        type: 'enum',
        enum: CartStatus,
        default: CartStatus.ACTIVE
    })
    status: CartStatus;

    @ApiPropertyOptional({
        description: 'Total price of all items in cart',
        example: 199.99
    })
    @Column({ type: 'float', default: 0, name: 'total_price' })
    totalPrice: number;

    @ApiPropertyOptional({
        description: 'Currency code for the cart',
        enum: ['EGP', 'SAR', 'USD', 'EUR']
    })
    @Column({
        type: 'enum',
        enum: ['EGP', 'SAR', 'USD', 'EUR'],
        default: 'USD'
    })
    currencyCode: string;

    @OneToMany(() => CartItem, (item) => item.cart, { cascade: true })
    items: CartItem[];

    @OneToMany(() => Payment, (payment) => payment.cart)
    payments: Payment[];

    @OneToMany(() => Transaction, (transaction) => transaction.cart)
    transactions: Transaction[];

    @ApiPropertyOptional({
        description: 'Number of items in cart',
        example: 3
    })
    @Column({ type: 'int', default: 0, name: 'items_count' })
    itemsCount: number;

    // Helper method to calculate totals
    calculateTotals(): void {
        if (!this.items) {
            this.items = [];
        }

        this.itemsCount = this.items.length;
        this.totalPrice = this.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);
    }

    // Mark cart as completed
    markAsCompleted(): void {
        this.status = CartStatus.COMPLETED;
    }
}