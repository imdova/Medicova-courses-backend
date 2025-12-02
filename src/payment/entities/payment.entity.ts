import { BasicEntity } from '../../common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import { Entity, Column, ManyToOne, Index, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Transaction } from './transaction.entity';

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  FAWRY = 'FAWRY',
  MEEZA = 'MEEZA',
  PAYMOB = 'PAYMOB',
  PAYTABS = 'PAYTABS',
  INSTANT_TRANSFER = 'INSTANT_TRANSFER',
}

@Entity('payments')
export class Payment extends BasicEntity {
  @ApiProperty({ description: 'User who made the payment', type: () => User })
  @ManyToOne(() => User, (user) => user.payments)
  user: User;

  @ApiProperty({ description: 'Cart associated with this payment', type: () => Cart })
  @ManyToOne(() => Cart, (cart) => cart.payments)
  cart: Cart;

  @ApiProperty({ description: 'Cart ID' })
  @Column({ type: 'uuid' })
  cartId: string;

  @ApiProperty({ description: 'Payment method used', enum: PaymentMethod })
  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiProperty({ description: 'Payment amount', example: 200.5 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({ description: 'Transaction ID from provider', nullable: true })
  @Index()
  @Column({ nullable: true })
  providerTransactionId: string;

  @ApiProperty({
    description: 'Raw response from payment provider',
    nullable: true,
  })
  @Column({ type: 'json', nullable: true })
  providerResponse: any;

  // Add relationship to transactions
  @ApiProperty({ description: 'Transactions for this payment', type: () => [Transaction] })
  @OneToMany(() => Transaction, (transaction) => transaction.payment)
  transactions: Transaction[];
}