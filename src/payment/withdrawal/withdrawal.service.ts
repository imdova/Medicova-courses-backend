import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere, Between, In } from 'typeorm';
import { PaymentService } from '../payment.service';
import { Withdrawal, WithdrawalStatus } from './entities/withdrawal.entity';
import { ProcessingTimeUnit, WithdrawalMethod } from './entities/withdrawal-method.entity';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';

export interface GetAvailableMethodsResponse {
  id: string;
  name: string;
  type: string;
  description: string;
  instructions?: string;
  iconUrl?: string;
  minAmount: number;
  maxAmount: number;
  feePercentage: number;
  estimatedFee: number;
  processingTime: number;
  processingTimeUnit: string;
  processingTimeText: string;
  isActive: boolean;
}

@Injectable()
export class WithdrawalService {
  private readonly logger = new Logger(WithdrawalService.name);

  constructor(
    @InjectRepository(Withdrawal)
    private withdrawalRepository: Repository<Withdrawal>,
    @InjectRepository(WithdrawalMethod)
    private withdrawalMethodRepository: Repository<WithdrawalMethod>,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
    private dataSource: DataSource,
  ) { }

  // ========== GET AVAILABLE METHODS ==========

  async getAvailableMethods(): Promise<GetAvailableMethodsResponse[]> {
    const methods = await this.withdrawalMethodRepository.find({
      where: { isActive: true },
    });

    return methods
      .map(method => ({
        id: method.id,
        name: method.name,
        type: method.type,
        description: method.description,
        iconUrl: method.iconUrl,
        minAmount: parseFloat(method.minAmount as any),
        maxAmount: parseFloat(method.maxAmount as any),
        feePercentage: parseFloat(method.feePercentage as any),
        estimatedFee: 0, // Will be calculated based on amount
        processingTime: method.processingTime,
        processingTimeUnit: method.processingTimeUnit,
        processingTimeText: this.getProcessingTimeText(method),
        isActive: method.isActive,
      }));
  }

  private getProcessingTimeText(method: WithdrawalMethod): string {
    const unitMap = {
      [ProcessingTimeUnit.MINUTES]: 'minutes',
      [ProcessingTimeUnit.HOURS]: 'hours',
      [ProcessingTimeUnit.DAYS]: 'days',
      [ProcessingTimeUnit.BUSINESS_DAYS]: 'business days',
    };

    return `${method.processingTime} ${unitMap[method.processingTimeUnit]}`;
  }

  // ========== REQUEST WITHDRAWAL ==========

  async requestWithdrawal(creatorId: string, dto: CreateWithdrawalDto): Promise<Withdrawal> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get wallet balance for the specific currency
      const walletArray = await this.getCreatorWallet(creatorId);

      // Find the wallet balance for the requested currency
      const walletForCurrency = walletArray.find(w => w.currency === dto.currency);

      if (!walletForCurrency) {
        throw new BadRequestException(
          `No earnings available in ${dto.currency} currency. Please check your wallet balance.`
        );
      }

      // 2. Get withdrawal method
      const method = await this.withdrawalMethodRepository.findOne({
        where: { id: dto.withdrawalMethodId, isActive: true },
      });

      if (!method) {
        throw new NotFoundException('Withdrawal method not found or inactive');
      }

      // 3. Validate amount against method limits
      if (dto.amount < parseFloat(method.minAmount as any)) {
        throw new BadRequestException(
          `Minimum withdrawal amount for ${method.name} is ${method.minAmount} ${dto.currency}`
        );
      }

      if (dto.amount > parseFloat(method.maxAmount as any)) {
        throw new BadRequestException(
          `Maximum withdrawal amount for ${method.name} is ${method.maxAmount} ${dto.currency}`
        );
      }

      // 4. Validate amount against wallet
      if (dto.amount > walletForCurrency.availableBalance) {
        throw new BadRequestException(
          `Insufficient balance in ${dto.currency}. Available: ${walletForCurrency.availableBalance} ${dto.currency}, Requested: ${dto.amount} ${dto.currency}`
        );
      }

      // 5. Calculate fees
      const processingFee = this.calculateFee(dto.amount, method);
      const netAmount = dto.amount - processingFee;

      // 6. Create withdrawal record
      const withdrawal = this.withdrawalRepository.create({
        creator: { id: creatorId },
        creatorId,
        withdrawalMethod: method,
        withdrawalMethodId: method.id,
        amount: dto.amount,
        currency: dto.currency,
        processingFee,
        netAmount,
        status: WithdrawalStatus.PENDING,
        metadata: dto.metadata,
      });

      const savedWithdrawal = await queryRunner.manager.save(withdrawal);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Withdrawal requested: ${savedWithdrawal.id}, ` +
        `Creator: ${creatorId}, ` +
        `Amount: ${dto.amount} ${dto.currency}, ` +
        `Method: ${method.name}`
      );

      return savedWithdrawal;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Withdrawal request failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }


  private calculateFee(amount: number, method: WithdrawalMethod): number {
    const feePercentage = parseFloat(method.feePercentage as any) / 100;

    const percentageFee = amount * feePercentage;
    const calculatedFee = Math.max(percentageFee, 0);

    return parseFloat(calculatedFee.toFixed(2));
  }

  private convertToHours(time: number, unit: ProcessingTimeUnit): number {
    switch (unit) {
      case ProcessingTimeUnit.MINUTES:
        return time / 60;
      case ProcessingTimeUnit.HOURS:
        return time;
      case ProcessingTimeUnit.DAYS:
        return time * 24;
      case ProcessingTimeUnit.BUSINESS_DAYS:
        return time * 24; // Approximate
      default:
        return 24;
    }
  }

  // ========== GET CREATOR WITHDRAWALS ==========

  async getCreatorWithdrawals(
    creatorId: string,
    filters: {
      status?: WithdrawalStatus;
      methodId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const where: FindOptionsWhere<Withdrawal> = { creatorId };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.methodId) {
      where.withdrawalMethodId = filters.methodId;
    }

    if (filters.startDate && filters.endDate) {
      where.created_at = Between(filters.startDate, filters.endDate);
    }

    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      where,
      relations: ['withdrawalMethod'],
      order: { created_at: 'DESC' },
      skip: ((filters.page || 1) - 1) * (filters.limit || 10),
      take: filters.limit || 10,
      select: [
        'id',
        'created_at',
        'amount',
        'currency',
        'processingFee',
        'netAmount',
        'status',
        'metadata',
        'processedAt',
      ],
    });

    return {
      withdrawals: withdrawals.map(w => ({
        ...w,
        methodName: w.withdrawalMethod?.name,
        methodType: w.withdrawalMethod?.type,
      })),
      pagination: {
        total,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: Math.ceil(total / (filters.limit || 10)),
      },
    };
  }

  // ========== WALLET METHODS ==========

  // Update the getCreatorWallet method
  async getCreatorWallet(creatorId: string) {
    const earningsArray = await this.paymentService.getCreatorEarnings(creatorId);

    // Using raw SQL query for better control
    const query = `
    SELECT
      currency,
      COALESCE(SUM(CASE 
        WHEN status IN ('PENDING', 'UNDER_REVIEW', 'PROCESSING') 
        THEN amount 
        ELSE 0 
      END), 0) as "pendingWithdrawals",
      COALESCE(SUM(CASE 
        WHEN status = 'COMPLETED' 
        THEN amount 
        ELSE 0 
      END), 0) as "totalWithdrawn",
      COALESCE(SUM(CASE 
        WHEN status IN ('FAILED', 'REJECTED', 'CANCELLED') 
        THEN amount 
        ELSE 0 
      END), 0) as "refundedAmount"
    FROM withdrawals
    WHERE creator_id = $1
    GROUP BY currency
  `;

    const withdrawalStats = await this.withdrawalRepository.query(query, [creatorId]);

    // Convert to map for easier lookup
    const withdrawalStatsMap = new Map();
    withdrawalStats.forEach(stat => {
      withdrawalStatsMap.set(stat.currency, {
        pendingWithdrawals: parseFloat(stat.pendingWithdrawals),
        totalWithdrawn: parseFloat(stat.totalWithdrawn),
        refundedAmount: parseFloat(stat.refundedAmount)
      });
    });

    // Return array per currency
    return earningsArray.map(earnings => {
      const currencyStats = withdrawalStatsMap.get(earnings.currency) || {
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        refundedAmount: 0
      };

      const availableBalance = Math.max(
        earnings.totalEarnings - currencyStats.pendingWithdrawals - currencyStats.totalWithdrawn,
        0
      );

      return {
        currency: earnings.currency,
        totalEarnings: earnings.totalEarnings,
        availableBalance,
        pendingWithdrawals: currencyStats.pendingWithdrawals,
        totalWithdrawn: currencyStats.totalWithdrawn,
        refundedAmount: currencyStats.refundedAmount,
        lastUpdated: new Date(),
      };
    });
  }

  // ========== ADMIN METHODS ==========

  async getAllWithdrawals(filters: {
    status?: WithdrawalStatus;
    methodId?: string;
    creatorId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const where: FindOptionsWhere<Withdrawal> = {};

    if (filters.status) where.status = filters.status;
    if (filters.methodId) where.withdrawalMethodId = filters.methodId;
    if (filters.creatorId) where.creatorId = filters.creatorId;

    if (filters.startDate && filters.endDate) {
      where.created_at = Between(filters.startDate, filters.endDate);
    }

    const [withdrawals, total] = await this.withdrawalRepository.findAndCount({
      where,
      relations: ['creator', 'withdrawalMethod', 'processedBy'],
      order: { created_at: 'DESC' },
      skip: ((filters.page || 1) - 1) * (filters.limit || 20),
      take: filters.limit || 20,
    });

    return {
      withdrawals,
      total,
      page: filters.page || 1,
      limit: filters.limit || 20,
    };
  }

  async getWithdrawalDetails(id: string) {
    const withdrawal = await this.withdrawalRepository.findOne({
      where: { id },
      relations: ['creator', 'withdrawalMethod', 'processedBy'],
    });

    if (!withdrawal) {
      throw new NotFoundException('Withdrawal not found');
    }

    return withdrawal;
  }

  async updateWithdrawalStatus(
    id: string,
    adminId: string,
    dto: UpdateWithdrawalStatusDto
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const withdrawal = await queryRunner.manager.findOne(Withdrawal, {
        where: { id },
        relations: ['creator'],
      });

      if (!withdrawal) {
        throw new NotFoundException('Withdrawal not found');
      }

      // Validate status transition
      this.validateStatusTransition(withdrawal.status, dto.status);

      // Update withdrawal
      withdrawal.status = dto.status;
      withdrawal.processedBy = { id: adminId } as any;
      withdrawal.processedById = adminId;

      if (dto.status === WithdrawalStatus.COMPLETED) {
        withdrawal.processedAt = new Date();

        // Process payment (implement gateway integration here)
        await this.processPayment(withdrawal, dto);
      }

      if (dto.status === WithdrawalStatus.REJECTED && dto.rejectionReason) {
        withdrawal.rejectionReason = dto.rejectionReason;
        // Refund amount back to creator's available balance
        await this.refundToWallet(withdrawal.creatorId, withdrawal.amount);
      }

      const updatedWithdrawal = await queryRunner.manager.save(withdrawal);

      // Send notification to creator
      await this.sendStatusNotification(updatedWithdrawal);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Withdrawal ${id} status updated to ${dto.status} by admin ${adminId}`
      );

      return updatedWithdrawal;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update withdrawal status: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private validateStatusTransition(current: WithdrawalStatus, next: WithdrawalStatus): void {
    const allowedTransitions = {
      //[WithdrawalStatus.PENDING]: [WithdrawalStatus.UNDER_REVIEW, WithdrawalStatus.CANCELLED],
      [WithdrawalStatus.PENDING]: [WithdrawalStatus.COMPLETED, WithdrawalStatus.FAILED],
      [WithdrawalStatus.UNDER_REVIEW]: [WithdrawalStatus.PROCESSING, WithdrawalStatus.REJECTED],
      [WithdrawalStatus.PROCESSING]: [WithdrawalStatus.COMPLETED, WithdrawalStatus.FAILED],
      [WithdrawalStatus.COMPLETED]: [],
      [WithdrawalStatus.FAILED]: [WithdrawalStatus.PROCESSING, WithdrawalStatus.CANCELLED],
      [WithdrawalStatus.CANCELLED]: [],
      [WithdrawalStatus.REJECTED]: [],
    };

    if (!allowedTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Invalid status transition from ${current} to ${next}`
      );
    }
  }

  private async processPayment(withdrawal: Withdrawal, dto: UpdateWithdrawalStatusDto): Promise<void> {
    // Implement actual payment processing based on method type
    const method = await this.withdrawalMethodRepository.findOne({
      where: { id: withdrawal.withdrawalMethodId },
    });

    if (!method) return;

    this.logger.log(
      `Processing payment via ${method.name} for withdrawal ${withdrawal.id}: ` +
      `${withdrawal.netAmount} ${withdrawal.currency} to ${withdrawal.creatorId}`
    );

    // Here you would integrate with actual payment gateways:
    // - Instapay API
    // - Bank transfer API
    // - PayPal API
    // - E-wallet providers
    // - Crypto transfer
  }

  private async refundToWallet(creatorId: string, amount: number): Promise<void> {
    // Implement refund logic - add amount back to creator's available balance
    this.logger.log(`Refunding ${amount} to creator ${creatorId}`);
    // You might want to create a transaction record for this refund
  }

  private async sendStatusNotification(withdrawal: Withdrawal): Promise<void> {
    // Send email/push notification to creator
    this.logger.log(
      `Sending notification for withdrawal ${withdrawal.id}: Status changed to ${withdrawal.status}`
    );
  }

  // ========== WITHDRAWAL METHOD MANAGEMENT (ADMIN) ==========

  async createWithdrawalMethod(dto: any) {
    const method = this.withdrawalMethodRepository.create(dto);
    return this.withdrawalMethodRepository.save(method);
  }

  async updateWithdrawalMethod(id: string, dto: any) {
    const method = await this.withdrawalMethodRepository.findOne({
      where: { id },
    });

    if (!method) {
      throw new NotFoundException('Withdrawal method not found');
    }

    Object.assign(method, dto);
    return this.withdrawalMethodRepository.save(method);
  }

  async getWithdrawalStats() {
    const stats = await this.withdrawalRepository
      .createQueryBuilder('w')
      .select([
        'w.status',
        'COUNT(w.id) as count',
        'SUM(w.amount) as total_amount',
        'SUM(w.processingFee) as total_fees',
      ])
      .groupBy('w.status')
      .getRawMany();

    const methodStats = await this.withdrawalRepository
      .createQueryBuilder('w')
      .innerJoin('w.withdrawalMethod', 'method')
      .select([
        'method.name as method_name',
        'method.type as method_type',
        'COUNT(w.id) as count',
        'SUM(w.amount) as total_amount',
        'SUM(w.processingFee) as total_fees',
      ])
      .where('w.status = :status', { status: WithdrawalStatus.COMPLETED })
      .groupBy('method.name, method.type')
      .getRawMany();

    return {
      statusStats: stats.map(s => ({
        status: s.w_status,
        count: parseInt(s.count),
        totalAmount: parseFloat(s.total_amount),
        totalFees: parseFloat(s.total_fees),
      })),
      methodStats: methodStats.map(m => ({
        methodName: m.method_name,
        methodType: m.method_type,
        count: parseInt(m.count),
        totalAmount: parseFloat(m.total_amount),
        totalFees: parseFloat(m.total_fees),
      })),
      summary: {
        totalWithdrawn: stats
          .filter(s => s.w_status === WithdrawalStatus.COMPLETED)
          .reduce((sum, s) => sum + parseFloat(s.total_amount), 0),
        totalFees: stats
          .filter(s => s.w_status === WithdrawalStatus.COMPLETED)
          .reduce((sum, s) => sum + parseFloat(s.total_fees), 0),
        pendingCount: stats
          .find(s => s.w_status === WithdrawalStatus.PENDING)?.count || 0,
      },
    };
  }
}