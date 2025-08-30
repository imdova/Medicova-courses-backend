import { BasicEntity } from '../../common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

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

export enum CurrencyCode {
  EGP = 'EGP',
  SAR = 'SAR',
  USD = 'USD',
}

export enum OrderType {
  COURSE = 'COURSE',
  QUIZ = 'QUIZ',
  BUNDLE = 'BUNDLE',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

@Entity('payments')
export class Payment extends BasicEntity {
  @ApiProperty({ description: 'User who made the payment', type: () => User })
  @ManyToOne(() => User, (user) => user.payments)
  user: User;

  @ApiProperty({ description: 'Payment method used', enum: PaymentMethod })
  @Column({ type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiProperty({ description: 'Payment amount', example: 200.5 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({ description: 'Currency code', enum: CurrencyCode })
  @Column({ type: 'enum', enum: CurrencyCode, default: CurrencyCode.EGP })
  currency: CurrencyCode;

  @ApiProperty({ description: 'Type of order', enum: OrderType })
  @Column({ type: 'enum', enum: OrderType })
  orderType: OrderType;

  @ApiProperty({ description: 'ID of the purchased item', nullable: true })
  @Index()
  @Column({ nullable: true })
  orderId: string;

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
}
