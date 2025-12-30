import { Module } from '@nestjs/common';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Withdrawal } from './entities/withdrawal.entity';
import { WithdrawalMethod } from './entities/withdrawal-method.entity';
import { PaymentService } from '../payment.service';
import { Payment } from '../entities/payment.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import { CartItem } from 'src/cart/entities/cart-item.entity';
import { Transaction } from '../entities/transaction.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Withdrawal, WithdrawalMethod, Payment, Cart, CartItem, Transaction, User])],
  controllers: [WithdrawalController],
  providers: [WithdrawalService, PaymentService],
})
export class WithdrawalModule { }
