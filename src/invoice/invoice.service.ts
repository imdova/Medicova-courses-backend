// invoice.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, Like, FindOptionsWhere } from 'typeorm';
import { Invoice, InvoiceStatus, PaymentType } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { AdditionalCharge, AdditionalChargeType } from './entities/additional-charge.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(AdditionalCharge)
    private additionalChargeRepository: Repository<AdditionalCharge>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private dataSource: DataSource,
  ) { }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const prefix = 'INV';

    // Get the last invoice number for this month
    const lastInvoice = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.invoiceNumber LIKE :pattern', {
        pattern: `${prefix}-${year}${month}-%`
      })
      .orderBy('invoice.created_at', 'DESC')
      .getOne();

    let sequence = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('-');
      const lastSequence = parseInt(parts[2]) || 0;
      sequence = lastSequence + 1;
    }

    return `${prefix}-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  }

  async create(createInvoiceDto: CreateInvoiceDto, userId: string): Promise<InvoiceResponseDto> {
    // Verify user exists BEFORE starting transaction
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // START TRANSACTION
      await queryRunner.startTransaction();

      // Create invoice
      const invoice = new Invoice();
      invoice.invoiceNumber = await this.generateInvoiceNumber();
      invoice.invoiceDate = new Date(createInvoiceDto.invoiceDate);
      invoice.dueDate = new Date(createInvoiceDto.dueDate);
      invoice.paymentType = createInvoiceDto.paymentType;

      // From information
      invoice.fromName = createInvoiceDto.fromName;
      invoice.fromEmail = createInvoiceDto.fromEmail;
      invoice.fromPhone = createInvoiceDto.fromPhone;
      invoice.fromAddress = createInvoiceDto.fromAddress;

      // To information
      invoice.toName = createInvoiceDto.toName;
      invoice.toEmail = createInvoiceDto.toEmail;
      invoice.toPhone = createInvoiceDto.toPhone || null;
      invoice.toAddress = createInvoiceDto.toAddress || null;

      invoice.notes = createInvoiceDto.notes || null;
      invoice.status = InvoiceStatus.DRAFT;
      invoice.createdBy = userId;
      invoice.createdByUser = user;

      // First save the invoice to get an ID
      const savedInvoice = await queryRunner.manager.save(invoice);

      // Create invoice items
      if (createInvoiceDto.items && createInvoiceDto.items.length > 0) {
        const invoiceItems = createInvoiceDto.items.map(itemDto => {
          const invoiceItem = new InvoiceItem();
          invoiceItem.invoiceId = savedInvoice.id;
          invoiceItem.description = itemDto.description;
          invoiceItem.unitPrice = itemDto.unitPrice;
          invoiceItem.quantity = itemDto.quantity;
          invoiceItem.taxRate = itemDto.taxRate || 0;
          invoiceItem.discountRate = itemDto.discountRate || 0;
          invoiceItem.calculateTotals();
          return invoiceItem;
        });

        await queryRunner.manager.save(InvoiceItem, invoiceItems);
        savedInvoice.items = invoiceItems;
      }

      // Create additional charges
      if (createInvoiceDto.additionalCharges && createInvoiceDto.additionalCharges.length > 0) {
        const additionalCharges = createInvoiceDto.additionalCharges.map(chargeDto => {
          const additionalCharge = new AdditionalCharge();
          additionalCharge.invoiceId = savedInvoice.id;
          additionalCharge.type = chargeDto.type;
          additionalCharge.description = chargeDto.description;
          additionalCharge.amount = chargeDto.amount;
          additionalCharge.percentage = chargeDto.percentage || 0;
          additionalCharge.isPercentage = chargeDto.isPercentage || false;
          return additionalCharge;
        });

        await queryRunner.manager.save(AdditionalCharge, additionalCharges);
        savedInvoice.additionalCharges = additionalCharges;
      }

      // Calculate and update totals
      savedInvoice.calculateTotals();
      await queryRunner.manager.save(Invoice, savedInvoice);

      // COMMIT TRANSACTION
      await queryRunner.commitTransaction();

      // Reload the invoice with relations for response
      const finalInvoice = await this.invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: ['items', 'additionalCharges', 'createdByUser']
      });

      return this.mapToResponseDto(finalInvoice);
    } catch (error) {
      // ROLLBACK TRANSACTION only if transaction was started
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      // RELEASE QUERY RUNNER
      await queryRunner.release();
    }
  }

  async findAll(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: InvoiceStatus,
    search?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ data: InvoiceResponseDto[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('invoice.additionalCharges', 'additionalCharges')
      .leftJoinAndSelect('invoice.createdByUser', 'createdByUser')
      .where('invoice.createdBy = :userId', { userId })
      .orderBy('invoice.created_at', 'DESC');

    // Apply filters
    if (status) {
      query.andWhere('invoice.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(invoice.invoiceNumber LIKE :search OR invoice.toName LIKE :search OR invoice.toEmail LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (startDate && endDate) {
      query.andWhere('invoice.invoiceDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });
    }

    const [invoices, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: invoices.map(invoice => this.mapToResponseDto(invoice)),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(id: string, userId?: string): Promise<InvoiceResponseDto> {
    const where: FindOptionsWhere<Invoice> = { id };

    // If userId provided, ensure user owns the invoice
    if (userId) {
      where.createdBy = userId;
    }

    const invoice = await this.invoiceRepository.findOne({
      where,
      relations: ['items', 'additionalCharges', 'createdByUser']
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.mapToResponseDto(invoice);
  }

  async findByInvoiceNumber(invoiceNumber: string, userId?: string): Promise<InvoiceResponseDto> {
    const where: FindOptionsWhere<Invoice> = { invoiceNumber };

    if (userId) {
      where.createdBy = userId;
    }

    const invoice = await this.invoiceRepository.findOne({
      where,
      relations: ['items', 'additionalCharges', 'createdByUser']
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.mapToResponseDto(invoice);
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto, userId: string): Promise<InvoiceResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invoice = await this.invoiceRepository.findOne({
        where: { id, createdBy: userId },
        relations: ['items', 'additionalCharges']
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      // Update basic fields
      if (updateInvoiceDto.invoiceDate !== undefined) {
        invoice.invoiceDate = new Date(updateInvoiceDto.invoiceDate);
      }

      if (updateInvoiceDto.dueDate !== undefined) {
        invoice.dueDate = new Date(updateInvoiceDto.dueDate);
      }

      if (updateInvoiceDto.paymentType !== undefined) {
        invoice.paymentType = updateInvoiceDto.paymentType;
      }

      if (updateInvoiceDto.status !== undefined) {
        invoice.status = updateInvoiceDto.status;
      }

      if (updateInvoiceDto.fromName !== undefined) {
        invoice.fromName = updateInvoiceDto.fromName;
      }

      if (updateInvoiceDto.fromEmail !== undefined) {
        invoice.fromEmail = updateInvoiceDto.fromEmail;
      }

      if (updateInvoiceDto.fromPhone !== undefined) {
        invoice.fromPhone = updateInvoiceDto.fromPhone;
      }

      if (updateInvoiceDto.fromAddress !== undefined) {
        invoice.fromAddress = updateInvoiceDto.fromAddress;
      }

      if (updateInvoiceDto.toName !== undefined) {
        invoice.toName = updateInvoiceDto.toName;
      }

      if (updateInvoiceDto.toEmail !== undefined) {
        invoice.toEmail = updateInvoiceDto.toEmail;
      }

      if (updateInvoiceDto.toPhone !== undefined) {
        invoice.toPhone = updateInvoiceDto.toPhone;
      }

      if (updateInvoiceDto.toAddress !== undefined) {
        invoice.toAddress = updateInvoiceDto.toAddress;
      }

      if (updateInvoiceDto.notes !== undefined) {
        invoice.notes = updateInvoiceDto.notes;
      }

      if (updateInvoiceDto.amountPaid !== undefined) {
        invoice.amountPaid = updateInvoiceDto.amountPaid;
        invoice.balanceDue = invoice.total - invoice.amountPaid;

        // Auto-update status if fully paid
        if (invoice.balanceDue <= 0) {
          invoice.status = InvoiceStatus.PAID;
        }
      }

      // Update items if provided
      if (updateInvoiceDto.items && updateInvoiceDto.items.length > 0) {
        // Remove existing items and create new ones
        await queryRunner.manager.delete(InvoiceItem, { invoiceId: id });

        invoice.items = updateInvoiceDto.items.map(itemDto => {
          const invoiceItem = new InvoiceItem();
          invoiceItem.description = itemDto.description;
          invoiceItem.unitPrice = itemDto.unitPrice;
          invoiceItem.quantity = itemDto.quantity;
          invoiceItem.taxRate = itemDto.taxRate || 0;
          invoiceItem.discountRate = itemDto.discountRate || 0;
          invoiceItem.calculateTotals();
          return invoiceItem;
        });
      }

      // Update additional charges if provided
      if (updateInvoiceDto.additionalCharges !== undefined) {
        // Remove existing charges and create new ones
        await queryRunner.manager.delete(AdditionalCharge, { invoiceId: id });

        invoice.additionalCharges = updateInvoiceDto.additionalCharges.map(chargeDto => {
          const additionalCharge = new AdditionalCharge();
          additionalCharge.type = chargeDto.type;
          additionalCharge.description = chargeDto.description;
          additionalCharge.amount = chargeDto.amount;
          additionalCharge.percentage = chargeDto.percentage || 0;
          additionalCharge.isPercentage = chargeDto.isPercentage || false;
          return additionalCharge;
        });
      }

      // Recalculate totals
      invoice.calculateTotals();

      const updatedInvoice = await queryRunner.manager.save(invoice);
      await queryRunner.commitTransaction();

      return this.mapToResponseDto(updatedInvoice);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, createdBy: userId }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot delete a paid invoice');
    }

    // Soft delete
    await this.invoiceRepository.softDelete(id);
  }

  async markAsPaid(id: string, userId: string, amount?: number): Promise<InvoiceResponseDto> {
    const invoice = await this.invoiceRepository.findOne({
      where: { id, createdBy: userId }
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const paymentAmount = amount || invoice.total;
    invoice.markAsPaid(paymentAmount);

    const updatedInvoice = await this.invoiceRepository.save(invoice);
    return this.mapToResponseDto(updatedInvoice);
  }

  async duplicate(id: string, userId: string): Promise<InvoiceResponseDto> {
    const original = await this.invoiceRepository.findOne({
      where: { id, createdBy: userId },
      relations: ['items', 'additionalCharges']
    });

    if (!original) {
      throw new NotFoundException('Invoice not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create new invoice with "-COPY" suffix
      const newInvoice = new Invoice();
      newInvoice.invoiceNumber = await this.generateInvoiceNumber();
      newInvoice.invoiceDate = new Date();
      newInvoice.dueDate = new Date(); // Default due date
      newInvoice.paymentType = original.paymentType;
      newInvoice.status = InvoiceStatus.DRAFT;
      newInvoice.createdBy = userId;

      // Copy from/to information
      newInvoice.fromName = original.fromName;
      newInvoice.fromEmail = original.fromEmail;
      newInvoice.fromPhone = original.fromPhone;
      newInvoice.fromAddress = original.fromAddress;
      newInvoice.toName = original.toName;
      newInvoice.toEmail = original.toEmail;
      newInvoice.toPhone = original.toPhone;
      newInvoice.toAddress = original.toAddress;
      newInvoice.notes = `Copy of ${original.invoiceNumber}\n${original.notes || ''}`;

      // Copy items
      newInvoice.items = original.items.map(item => {
        const newItem = new InvoiceItem();
        newItem.description = item.description;
        newItem.unitPrice = item.unitPrice;
        newItem.quantity = item.quantity;
        newItem.taxRate = item.taxRate;
        newItem.discountRate = item.discountRate;
        newItem.calculateTotals();
        return newItem;
      });

      // Copy additional charges
      newInvoice.additionalCharges = original.additionalCharges.map(charge => {
        const newCharge = new AdditionalCharge();
        newCharge.type = charge.type;
        newCharge.description = charge.description;
        newCharge.amount = charge.amount;
        newCharge.percentage = charge.percentage;
        newCharge.isPercentage = charge.isPercentage;
        return newCharge;
      });

      // Calculate totals
      newInvoice.calculateTotals();

      const savedInvoice = await queryRunner.manager.save(newInvoice);
      await queryRunner.commitTransaction();

      return this.mapToResponseDto(savedInvoice);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getStatistics(userId: string): Promise<any> {
    const query = this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.createdBy = :userId', { userId });

    const [totalInvoices] = await query
      .select('COUNT(*)', 'count')
      .getRawOne();

    const [totalAmount] = await query
      .select('SUM(invoice.total)', 'total')
      .where('invoice.status = :status', { status: InvoiceStatus.PAID })
      .getRawOne();

    const [pendingAmount] = await query
      .select('SUM(invoice.balanceDue)', 'total')
      .where('invoice.status = :status', { status: InvoiceStatus.PENDING })
      .getRawOne();

    const overdueInvoices = await query
      .andWhere('invoice.status = :status', { status: InvoiceStatus.PENDING })
      .andWhere('invoice.dueDate < :today', { today: new Date() })
      .getCount();

    return {
      totalInvoices: parseInt(totalInvoices.count) || 0,
      totalAmount: parseFloat(totalAmount.total) || 0,
      pendingAmount: parseFloat(pendingAmount.total) || 0,
      overdueInvoices,
      statusDistribution: {
        draft: await query.clone().andWhere('invoice.status = :status', { status: InvoiceStatus.DRAFT }).getCount(),
        pending: await query.clone().andWhere('invoice.status = :status', { status: InvoiceStatus.PENDING }).getCount(),
        paid: await query.clone().andWhere('invoice.status = :status', { status: InvoiceStatus.PAID }).getCount(),
        overdue: overdueInvoices,
      }
    };
  }

  private mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paymentType: invoice.paymentType,
      fromName: invoice.fromName,
      fromEmail: invoice.fromEmail,
      fromPhone: invoice.fromPhone,
      fromAddress: invoice.fromAddress,
      toName: invoice.toName,
      toEmail: invoice.toEmail,
      toPhone: invoice.toPhone,
      toAddress: invoice.toAddress,
      subtotal: invoice.subtotal,
      totalDiscount: invoice.totalDiscount,
      totalTax: invoice.totalTax,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      createdBy: invoice.createdBy,
      items: invoice.items ? invoice.items.map(item => ({
        id: item.id,
        description: item.description,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        discountRate: item.discountRate,
        discountAmount: item.discountAmount,
        createdAt: item.created_at
      })) : [],
      additionalCharges: invoice.additionalCharges ? invoice.additionalCharges.map(charge => ({
        id: charge.id,
        type: charge.type,
        description: charge.description,
        amount: charge.amount,
        percentage: charge.percentage,
        isPercentage: charge.isPercentage,
        createdAt: charge.created_at
      })) : [],
      notes: invoice.notes,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
      isOverdue: invoice.isOverdue(),
      daysUntilDue: daysUntilDue,
      creatorName: invoice.createdByUser?.email,
      creatorEmail: invoice.createdByUser?.email
    };
  }
}