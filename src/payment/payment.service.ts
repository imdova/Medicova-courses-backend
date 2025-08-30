import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderType, Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const payment = this.paymentRepo.create(dto);
    return this.paymentRepo.save(payment);
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentRepo.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async update(id: string, dto: UpdatePaymentDto): Promise<Payment> {
    const payment = await this.findOne(id);
    Object.assign(payment, dto);
    return this.paymentRepo.save(payment);
  }

  async remove(id: string): Promise<void> {
    const payment = await this.findOne(id);
    await this.paymentRepo.remove(payment);
  }

  async createPayment(
    dto: CreatePaymentDto & {
      userId: string;
      orderId: string;
      orderType: OrderType;
    },
  ): Promise<Payment> {
    const { userId, orderId, orderType, method, amount, currency } = dto;

    const payment = this.paymentRepo.create({
      user: { id: userId } as User,
      orderId,
      orderType, // must be OrderType enum
      method,
      amount,
      currency,
      status: PaymentStatus.PENDING,
    });

    return this.paymentRepo.save(payment);
  }
}
