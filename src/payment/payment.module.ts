import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from './entities/payment.entity';
import { User } from 'src/user/entities/user.entity';
import { Cart } from 'src/cart/entities/cart.entity';
import { CartItem } from 'src/cart/entities/cart-item.entity';
import { Transaction } from './entities/transaction.entity';
import { WithdrawalModule } from './withdrawal/withdrawal.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User, Cart, CartItem, Transaction]), WithdrawalModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule { }
