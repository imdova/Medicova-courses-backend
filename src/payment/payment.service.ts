// payment.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, FindOptionsWhere } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { Cart, CartStatus } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Transaction, TransactionStatus } from './entities/transaction.entity';
import { User } from 'src/user/entities/user.entity';

interface GetAllTransactionsFilters {
  creatorId?: string;
  buyerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) { }

  // ========== CART CHECKOUT ==========

  async createCartCheckout(
    userId: string,
    cartId: string,
    paymentMethod: PaymentMethod
  ): Promise<{ payment: Payment; transactions: Transaction[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get cart with items and user
      const cart = await queryRunner.manager.findOne(Cart, {
        where: {
          id: cartId,
          createdBy: userId,
          status: CartStatus.ACTIVE
        },
        relations: ['items', 'items.creator', 'user'],
      });

      if (!cart) {
        throw new NotFoundException('Cart not found, already processed, or does not belong to user');
      }

      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // 2. Create payment record
      const payment = queryRunner.manager.create(Payment, {
        user: { id: userId },
        cart: { id: cartId },
        cartId,
        method: paymentMethod,
        status: PaymentStatus.PENDING,
        amount: cart.totalPrice,
      });

      const savedPayment = await queryRunner.manager.save(Payment, payment);

      // 3. Create transactions for each cart item
      const transactions: Transaction[] = [];
      const platformFeePercentage = 10; // Example: 10% platform fee

      for (const item of cart.items) {
        const totalPrice = item.price * item.quantity;
        const platformFeeAmount = totalPrice * (platformFeePercentage / 100);
        const creatorAmount = totalPrice - platformFeeAmount;

        const transaction = queryRunner.manager.create(Transaction, {
          creator: { id: item.creatorId },
          creatorId: item.creatorId,
          buyer: cart.user,
          buyerId: cart.createdBy,
          cart: { id: cartId },
          cartId,
          cartItem: item,
          cartItemId: item.id,
          payment: savedPayment,
          paymentId: savedPayment.id,
          status: TransactionStatus.PENDING,
          amount: creatorAmount,
          currency: item.currencyCode,
          platformFeePercentage,
          platformFeeAmount,
          totalPrice,
          itemType: item.itemType,
          itemId: item.getItemId(),
          itemTitle: item.itemTitle,
          quantity: item.quantity,
        });

        const savedTransaction = await queryRunner.manager.save(Transaction, transaction);
        transactions.push(savedTransaction);
      }

      // 4. Update cart status to PROCESSING
      cart.status = CartStatus.COMPLETED; // Or you can create a new status CHECKOUT_IN_PROGRESS
      await queryRunner.manager.save(Cart, cart);

      await queryRunner.commitTransaction();

      this.logger.log(`Checkout completed for cart ${cartId}, created payment ${savedPayment.id} and ${transactions.length} transactions`);

      return {
        payment: savedPayment,
        transactions
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Cart checkout failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Remove createTransactionsForCart method - it's now part of checkout

  async confirmPayment(paymentId: string, providerData: any): Promise<{ success: boolean; message: string; payment: Payment; transactions: Transaction[] }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update payment status
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { id: paymentId },
        relations: ['cart', 'transactions'],
      });

      if (!payment) {
        throw new NotFoundException('Payment not found');
      }

      if (payment.status === PaymentStatus.SUCCESS) {
        throw new BadRequestException('Payment already confirmed');
      }

      payment.status = PaymentStatus.SUCCESS;
      payment.providerTransactionId = providerData.transactionId || providerData.id;
      payment.providerResponse = providerData;
      await queryRunner.manager.save(payment);

      // 2. Get all transactions for this payment and mark them as PAID
      await queryRunner.manager.update(
        Transaction,
        { paymentId: paymentId },
        {
          status: TransactionStatus.PAID,
          updated_at: new Date(),
        }
      );

      // 3. Get updated transactions
      const transactions = await queryRunner.manager.find(Transaction, {
        where: { paymentId: paymentId },
        relations: ['creator', 'buyer', 'cartItem'],
      });

      await queryRunner.commitTransaction();

      this.logger.log(`Payment ${paymentId} confirmed successfully, updated ${transactions.length} transactions to PAID`);

      return {
        success: true,
        message: 'Payment confirmed successfully',
        payment,
        transactions
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Payment confirmation failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async confirmPaymentByCart(cartId: string, userId?: string): Promise<{ success: boolean; message: string; payment: Payment }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find the pending payment for this cart WITH user validation
      const payment = await queryRunner.manager.findOne(Payment, {
        where: {
          cartId,
          status: PaymentStatus.PENDING,
        },
        relations: ['cart', 'user'], // Load cart and user for validation
      });

      if (!payment) {
        throw new NotFoundException('Pending payment not found for this cart');
      }

      // 2. Validate user ownership (if userId is provided)
      if (userId && payment.user.id !== userId) {
        throw new ForbiddenException('You are not authorized to confirm this payment');
      }

      // 3. Update payment status
      payment.status = PaymentStatus.SUCCESS;
      await queryRunner.manager.save(payment);

      // 4. Mark all transactions as PAID
      await queryRunner.manager.update(
        Transaction,
        { paymentId: payment.id },
        {
          status: TransactionStatus.PAID,
          updated_at: new Date(),
        }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Payment confirmed for cart ${cartId}, payment ${payment.id}`);

      return {
        success: true,
        message: 'Payment confirmed successfully',
        payment
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Payment confirmation failed for cart ${cartId}: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update payment status to FAILED
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { id: paymentId, status: PaymentStatus.PENDING },
      });

      if (!payment) {
        throw new NotFoundException('Pending payment not found');
      }

      payment.status = PaymentStatus.FAILED;
      await queryRunner.manager.save(payment);

      // 2. Mark all transactions as CANCELLED (or keep as PENDING for retry)
      await queryRunner.manager.update(
        Transaction,
        { paymentId: paymentId, status: TransactionStatus.PENDING },
        {
          status: TransactionStatus.CANCELLED,
          updated_at: new Date(),
        }
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Payment ${paymentId} cancelled, transactions marked as CANCELLED`);

      return {
        success: true,
        message: 'Payment cancelled successfully'
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Payment cancellation failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelPaymentByCart(cartId: string, userId?: string): Promise<{ success: boolean; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find the pending payment for this cart WITH user validation
      const payment = await queryRunner.manager.findOne(Payment, {
        where: {
          cartId,
          status: PaymentStatus.PENDING,
        },
        relations: ['cart', 'user'], // Load cart and user for validation
      });

      if (!payment) {
        throw new NotFoundException('Pending payment not found for this cart');
      }

      // 2. Validate user ownership (if userId is provided)
      if (userId && payment.user.id !== userId) {
        throw new ForbiddenException('You are not authorized to cancel this payment');
      }

      // 3. Update payment status to FAILED
      payment.status = PaymentStatus.FAILED;
      await queryRunner.manager.save(payment);

      // 4. Mark all pending transactions as CANCELLED
      await queryRunner.manager.update(
        Transaction,
        { paymentId: payment.id, status: TransactionStatus.PENDING },
        {
          status: TransactionStatus.CANCELLED,
          updated_at: new Date(),
        }
      );

      // 5. Reset cart status to ACTIVE so user can retry
      if (payment.cart) {
        payment.cart.status = CartStatus.ACTIVE;
        await queryRunner.manager.save(payment.cart);
      }

      await queryRunner.commitTransaction();

      this.logger.log(`Payment cancelled for cart ${cartId}, payment ${payment.id}`);

      return {
        success: true,
        message: 'Payment cancelled successfully'
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Payment cancellation failed for cart ${cartId}: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ========== USER PAYMENTS & TRANSACTIONS ==========

  async getUserPayments(userId: string, page = 1, limit = 10): Promise<{
    payments: Payment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['cart', 'transactions'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      payments,
      total,
      page,
      limit,
    };
  }

  async getUserTransactions(userId: string, page = 1, limit = 10): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [transactions, total] = await this.transactionRepository.findAndCount({
      where: { buyerId: userId },
      relations: ['creator', 'cartItem', 'payment'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  // ========== CREATOR ANALYTICS ==========

  async getCreatorEarnings(creatorId: string): Promise<{
    totalEarnings: number;
    pendingEarnings: number;
    currentBalance: number;
    monthlyEarnings: number;
    transactionsCount: number;
    paidTransactionsCount: number;
    pendingTransactionsCount: number;
  }> {
    // Verify creator exists
    const creator = await this.userRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Get paid transactions stats
    const paidStats = await this.transactionRepository
      .createQueryBuilder('t')
      .select([
        'SUM(t.amount) as total_earnings',
        'COUNT(t.id) as transactions_count',
        `SUM(CASE 
          WHEN EXTRACT(MONTH FROM t.updated_at) = EXTRACT(MONTH FROM NOW()) 
          AND EXTRACT(YEAR FROM t.updated_at) = EXTRACT(YEAR FROM NOW()) 
          THEN t.amount 
          ELSE 0 
        END) as monthly_earnings`,
      ])
      .where('t.creator_id = :creatorId', { creatorId })
      .andWhere('t.status = :status', { status: TransactionStatus.PAID })
      .getRawOne();

    // Get pending transactions stats
    const pendingStats = await this.transactionRepository
      .createQueryBuilder('t')
      .select([
        'SUM(t.amount) as pending_earnings',
        'COUNT(t.id) as pending_transactions_count',
      ])
      .where('t.creator_id = :creatorId', { creatorId })
      .andWhere('t.status = :status', { status: TransactionStatus.PENDING })
      .getRawOne();

    return {
      totalEarnings: parseFloat(paidStats?.total_earnings || '0'),
      pendingEarnings: parseFloat(pendingStats?.pending_earnings || '0'),
      currentBalance: parseFloat(paidStats?.total_earnings || '0'),
      monthlyEarnings: parseFloat(paidStats?.monthly_earnings || '0'),
      transactionsCount: parseInt(paidStats?.transactions_count || '0') + parseInt(pendingStats?.pending_transactions_count || '0'),
      paidTransactionsCount: parseInt(paidStats?.transactions_count || '0'),
      pendingTransactionsCount: parseInt(pendingStats?.pending_transactions_count || '0'),
    };
  }

  async getCreatorTransactions(
    creatorId: string,
    status?: string,
    page = 1,
    limit = 10
  ): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: FindOptionsWhere<Transaction> = { creatorId };

    if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
      where.status = status as TransactionStatus;
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where,
      relations: ['buyer', 'cartItem', 'payment'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  async getCreatorTopSellingItems(
    creatorId: string,
    limit = 10
  ): Promise<Array<{
    itemId: string;
    itemTitle: string;
    itemType: string;
    sales: number;
    revenue: number;
    averagePrice: number;
  }>> {
    const topItems = await this.transactionRepository
      .createQueryBuilder('t')
      .select([
        't.itemId',
        't.itemTitle',
        't.itemType',
        'COUNT(t.id) as sales',
        'SUM(t.amount) as revenue',
        'AVG(t.totalPrice / t.quantity) as averagePrice',
      ])
      .where('t.creatorId = :creatorId', { creatorId })
      .andWhere('t.status = :status', { status: TransactionStatus.PAID })
      .groupBy('t.itemId, t.itemTitle, t.itemType')
      .orderBy('sales', 'DESC')
      .limit(limit)
      .getRawMany();

    return topItems.map(item => ({
      itemId: item.t_itemId,
      itemTitle: item.t_itemTitle,
      itemType: item.t_itemType,
      sales: parseInt(item.sales),
      revenue: parseFloat(item.revenue),
      averagePrice: parseFloat(item.averagePrice),
    }));
  }

  // ========== ADMIN ANALYTICS ==========

  async getPlatformStats(): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    totalPayments: number;
    paymentMethodStats: Array<{
      method: PaymentMethod;
      count: number;
      totalAmount: number;
      successRate: number;
    }>;
    topCreators: Array<{
      creatorId: string;
      creatorEmail?: string;
      earnings: number;
      salesCount: number;
      averageSale: number;
    }>;
    recentTransactions: Transaction[];
  }> {
    // Get payment method statistics
    const paymentMethodStats = await this.paymentRepository
      .createQueryBuilder('p')
      .select([
        'p.method',
        'COUNT(p.id) as count',
        'SUM(CASE WHEN p.status = :success THEN p.amount ELSE 0 END) as successAmount',
        'SUM(CASE WHEN p.status = :success THEN 1 ELSE 0 END) as successCount',
      ])
      .setParameters({
        success: PaymentStatus.SUCCESS
      })
      .groupBy('p.method')
      .getRawMany();

    // Get top creators
    const topCreators = await this.transactionRepository
      .createQueryBuilder('t')
      .innerJoin('t.creator', 'creator')
      .select([
        't.creatorId',
        'creator.email as creatorEmail',
        'SUM(t.amount) as earnings',
        'COUNT(t.id) as salesCount',
        'AVG(t.amount) as averageSale',
      ])
      .where('t.status = :status', { status: TransactionStatus.PAID })
      .groupBy('t.creatorId, creator.email')
      .orderBy('earnings', 'DESC')
      .limit(20)
      .getRawMany();

    // Total platform revenue (sum of all platform fees)
    const totalRevenueResult = await this.transactionRepository
      .createQueryBuilder('t')
      .select('SUM(t.platformFeeAmount)', 'total')
      .where('t.status = :status', { status: TransactionStatus.PAID })
      .getRawOne();

    const totalTransactions = await this.transactionRepository.count({
      where: { status: TransactionStatus.PAID },
    });

    const totalPayments = await this.paymentRepository.count({
      where: { status: PaymentStatus.SUCCESS },
    });

    // Get recent transactions
    const recentTransactions = await this.transactionRepository.find({
      where: { status: TransactionStatus.PAID },
      relations: ['creator', 'buyer', 'payment'],
      order: { created_at: 'DESC' },
      take: 10,
    });

    return {
      totalRevenue: parseFloat(totalRevenueResult?.total || '0'),
      totalTransactions,
      totalPayments,
      paymentMethodStats: paymentMethodStats.map(stat => ({
        method: stat.p_method as PaymentMethod,
        count: parseInt(stat.count),
        totalAmount: parseFloat(stat.successAmount || '0'),
        successRate: parseFloat(stat.successCount) / parseInt(stat.count) * 100 || 0,
      })),
      topCreators: topCreators.map(creator => ({
        creatorId: creator.t_creatorId,
        creatorEmail: creator.creatorEmail,
        earnings: parseFloat(creator.earnings),
        salesCount: parseInt(creator.salesCount),
        averageSale: parseFloat(creator.averageSale),
      })),
      recentTransactions,
    };
  }

  async getAllTransactions(filters: GetAllTransactionsFilters): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      creatorId,
      buyerId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const where: FindOptionsWhere<Transaction> = {};

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (buyerId) {
      where.buyerId = buyerId;
    }

    if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
      where.status = status as TransactionStatus;
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      where.created_at = Between(start, end);
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where,
      relations: ['creator', 'buyer', 'payment', 'cartItem'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  async getAllPayments(
    method?: PaymentMethod,
    status?: string,
    page = 1,
    limit = 20,
  ): Promise<{
    payments: Payment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: FindOptionsWhere<Payment> = {};

    if (method && Object.values(PaymentMethod).includes(method)) {
      where.method = method;
    }

    if (status && Object.values(PaymentStatus).includes(status as PaymentStatus)) {
      where.status = status as PaymentStatus;
    }

    const [payments, total] = await this.paymentRepository.findAndCount({
      where,
      relations: ['user', 'cart', 'transactions'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      payments,
      total,
      page,
      limit,
    };
  }
}