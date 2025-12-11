// invoice.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, FindOptionsWhere } from 'typeorm';
import { Invoice, InvoiceStatus, PaymentType } from './entities/invoice.entity';
import { InvoiceItem, InvoiceItemType } from './entities/invoice-item.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { User } from '../user/entities/user.entity';
import { Course } from '../course/entities/course.entity';
import { Bundle } from '../bundle/entities/bundle.entity';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Bundle)
    private bundleRepository: Repository<Bundle>,
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
    // Verify user exists
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
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

      // Invoice level rates
      invoice.discountRate = createInvoiceDto.discountRate || 0;
      invoice.taxRate = createInvoiceDto.taxRate || 0;

      invoice.notes = createInvoiceDto.notes || null;
      invoice.status = InvoiceStatus.PENDING;
      invoice.createdBy = userId;
      invoice.createdByUser = user;

      // Save invoice first
      const savedInvoice = await queryRunner.manager.save(invoice);

      // Create invoice items
      if (createInvoiceDto.items && createInvoiceDto.items.length > 0) {
        const invoiceItems = await Promise.all(
          createInvoiceDto.items.map(async (itemDto) => {
            const invoiceItem = new InvoiceItem();
            invoiceItem.invoiceId = savedInvoice.id;
            invoiceItem.itemType = itemDto.itemType;
            invoiceItem.currencyCode = itemDto.currencyCode;
            invoiceItem.quantity = itemDto.quantity || 1;

            // Get item details and price based on type and currency
            if (itemDto.itemType === InvoiceItemType.COURSE) {
              // Fetch course with relations
              const course = await this.courseRepository.findOne({
                where: { id: itemDto.itemId },
                relations: ['instructor', 'pricings']
              });

              if (!course) {
                throw new NotFoundException(`Course with ID ${itemDto.itemId} not found`);
              }

              // Find the pricing for the requested currency
              const pricing = course.pricings?.find(p =>
                p.currencyCode === itemDto.currencyCode &&
                p.isActive
              );

              if (!pricing) {
                throw new BadRequestException(
                  `Course ${course.name} is not available in ${itemDto.currencyCode} currency`
                );
              }

              // Use sale price if available and discount is enabled, otherwise use regular price
              const price = pricing.discountEnabled && pricing.salePrice
                ? pricing.salePrice
                : pricing.regularPrice;

              invoiceItem.courseId = itemDto.itemId;
              invoiceItem.course = course;
              invoiceItem.itemTitle = course.name; // Use course.name instead of .title
              invoiceItem.price = price;
              invoiceItem.creatorId = course.createdBy; // This should be a string ID
              invoiceItem.thumbnailUrl = course.courseImage; // Use courseImage field

            } else if (itemDto.itemType === InvoiceItemType.BUNDLE) {
              // Fetch bundle with relations
              const bundle = await this.bundleRepository.findOne({
                where: { id: itemDto.itemId },
                relations: ['pricings', 'instructor']
              });

              if (!bundle) {
                throw new NotFoundException(`Bundle with ID ${itemDto.itemId} not found`);
              }

              // Find the pricing for the requested currency
              const pricing = bundle.pricings?.find(p =>
                p.currency_code === itemDto.currencyCode &&
                p.is_active
              );

              if (!pricing) {
                throw new BadRequestException(
                  `Bundle ${bundle.title} is not available in ${itemDto.currencyCode} currency`
                );
              }

              // Use sale price if available and discount is enabled, otherwise use regular price
              const price = pricing.discount_enabled && pricing.sale_price
                ? pricing.sale_price
                : pricing.regular_price;

              invoiceItem.bundleId = itemDto.itemId;
              invoiceItem.bundle = bundle;
              invoiceItem.itemTitle = bundle.title;
              invoiceItem.price = price;
              invoiceItem.creatorId = bundle.created_by; // This is already a string
              invoiceItem.thumbnailUrl = bundle.thumbnail_url;

            } else {
              throw new BadRequestException('Invalid item type');
            }

            return invoiceItem;
          })
        );

        await queryRunner.manager.save(InvoiceItem, invoiceItems);
        savedInvoice.items = invoiceItems;
      }

      // Calculate totals
      savedInvoice.calculateTotals();
      await queryRunner.manager.save(Invoice, savedInvoice);

      await queryRunner.commitTransaction();

      // Reload the invoice with relations for response
      const finalInvoice = await this.invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: [
          'items',
          'items.course',
          'items.bundle',
          'items.creator',
          'createdByUser',
          'items.course.pricings',
          'items.bundle.pricings'
        ]
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

    // Debug logging
    console.log('findAll params:', { userId, page, limit, status, search, startDate, endDate });

    // First, let's check if there are any invoices for this user
    const invoiceCount = await this.invoiceRepository.count({
      where: { createdBy: userId }
    });
    console.log('Total invoices for user:', invoiceCount);

    if (invoiceCount === 0) {
      return {
        data: [],
        total: 0,
        page,
        totalPages: 0
      };
    }

    // Build query
    const queryBuilder = this.invoiceRepository
      .createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.items', 'items')
      .leftJoinAndSelect('invoice.createdByUser', 'createdByUser')
      .where('invoice.createdBy = :userId', { userId })
      .orderBy('invoice.created_at', 'DESC');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('invoice.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere(
        '(invoice.invoiceNumber LIKE :search OR invoice.toName LIKE :search OR invoice.toEmail LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('invoice.invoiceDate BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
    }

    // Get count first
    const total = await queryBuilder.getCount();
    console.log('Filtered total:', total);

    // Get paginated results
    const invoices = await queryBuilder
      .skip(skip)
      .take(limit)
      .getMany();

    console.log('Found invoices:', invoices.length);
    if (invoices.length > 0) {
      console.log('First invoice sample:', {
        id: invoices[0].id,
        invoiceNumber: invoices[0].invoiceNumber,
        createdBy: invoices[0].createdBy,
        itemsCount: invoices[0].items?.length || 0
      });
    }

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

    console.log('findOne looking for invoice with:', { id, userId });

    const invoice = await this.invoiceRepository.findOne({
      where,
      relations: [
        'items',
        'items.course',
        'items.bundle',
        'items.creator',
        'createdByUser',
        'items.course.pricings',
        'items.bundle.pricings'
      ]
    });

    if (!invoice) {
      console.log('Invoice not found with params:', { id, userId });
      throw new NotFoundException('Invoice not found');
    }

    console.log('Found invoice:', {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      createdBy: invoice.createdBy
    });

    return this.mapToResponseDto(invoice);
  }

  async findByInvoiceNumber(invoiceNumber: string, userId?: string): Promise<InvoiceResponseDto> {
    const where: FindOptionsWhere<Invoice> = { invoiceNumber };

    if (userId) {
      where.createdBy = userId;
    }

    const invoice = await this.invoiceRepository.findOne({
      where,
      relations: [
        'items',
        'items.course',
        'items.bundle',
        'items.creator',
        'createdByUser',
        'items.course.pricings',
        'items.bundle.pricings'
      ]
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.mapToResponseDto(invoice);
  }

  async update(id: string, updateInvoiceDto: UpdateInvoiceDto, userId: string): Promise<InvoiceResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const invoice = await queryRunner.manager.findOne(Invoice, {
        where: { id, createdBy: userId },
        relations: ['items']
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

      // Update from/to information
      if (updateInvoiceDto.fromName !== undefined) invoice.fromName = updateInvoiceDto.fromName;
      if (updateInvoiceDto.fromEmail !== undefined) invoice.fromEmail = updateInvoiceDto.fromEmail;
      if (updateInvoiceDto.fromPhone !== undefined) invoice.fromPhone = updateInvoiceDto.fromPhone;
      if (updateInvoiceDto.fromAddress !== undefined) invoice.fromAddress = updateInvoiceDto.fromAddress;
      if (updateInvoiceDto.toName !== undefined) invoice.toName = updateInvoiceDto.toName;
      if (updateInvoiceDto.toEmail !== undefined) invoice.toEmail = updateInvoiceDto.toEmail;
      if (updateInvoiceDto.toPhone !== undefined) invoice.toPhone = updateInvoiceDto.toPhone || null;
      if (updateInvoiceDto.toAddress !== undefined) invoice.toAddress = updateInvoiceDto.toAddress || null;

      // Update rates
      if (updateInvoiceDto.discountRate !== undefined) invoice.discountRate = updateInvoiceDto.discountRate;
      if (updateInvoiceDto.taxRate !== undefined) invoice.taxRate = updateInvoiceDto.taxRate;

      if (updateInvoiceDto.notes !== undefined) invoice.notes = updateInvoiceDto.notes || null;

      if (updateInvoiceDto.amountPaid !== undefined) {
        invoice.amountPaid = updateInvoiceDto.amountPaid;
        invoice.balanceDue = invoice.total - invoice.amountPaid;

        // Auto-update status if fully paid
        if (invoice.balanceDue <= 0) {
          invoice.status = InvoiceStatus.PAID;
        }
      }

      // Update items if provided (note: this completely replaces existing items)
      if (updateInvoiceDto.items !== undefined) {
        // Remove existing items
        if (invoice.items && invoice.items.length > 0) {
          await queryRunner.manager.delete(InvoiceItem, { invoiceId: id });
        }

        // Create new items if provided
        if (updateInvoiceDto.items.length > 0) {
          const invoiceItems = await Promise.all(
            updateInvoiceDto.items.map(async (itemDto) => {
              const invoiceItem = new InvoiceItem();
              invoiceItem.invoiceId = id;
              invoiceItem.itemType = itemDto.itemType;
              invoiceItem.currencyCode = itemDto.currencyCode;
              invoiceItem.quantity = itemDto.quantity || 1;

              // Get item details and price based on type and currency
              if (itemDto.itemType === InvoiceItemType.COURSE && itemDto.itemId) {
                const course = await this.courseRepository.findOne({
                  where: { id: itemDto.itemId },
                  relations: ['instructor', 'pricings']
                });

                if (!course) {
                  throw new NotFoundException(`Course with ID ${itemDto.itemId} not found`);
                }

                // Find the pricing for the requested currency
                const pricing = course.pricings?.find(p =>
                  p.currencyCode === itemDto.currencyCode &&
                  p.isActive
                );

                if (!pricing) {
                  throw new BadRequestException(
                    `Course ${course.name} is not available in ${itemDto.currencyCode} currency`
                  );
                }

                const price = pricing.discountEnabled && pricing.salePrice
                  ? pricing.salePrice
                  : pricing.regularPrice;

                invoiceItem.courseId = itemDto.itemId;
                invoiceItem.course = course;
                invoiceItem.itemTitle = course.name;
                invoiceItem.price = price;
                invoiceItem.creatorId = course.createdBy; // This is a string
                invoiceItem.thumbnailUrl = course.courseImage;

              } else if (itemDto.itemType === InvoiceItemType.BUNDLE && itemDto.itemId) {
                const bundle = await this.bundleRepository.findOne({
                  where: { id: itemDto.itemId },
                  relations: ['pricings', 'instructor']
                });

                if (!bundle) {
                  throw new NotFoundException(`Bundle with ID ${itemDto.itemId} not found`);
                }

                const pricing = bundle.pricings?.find(p =>
                  p.currency_code === itemDto.currencyCode &&
                  p.is_active
                );

                if (!pricing) {
                  throw new BadRequestException(
                    `Bundle ${bundle.title} is not available in ${itemDto.currencyCode} currency`
                  );
                }

                const price = pricing.discount_enabled && pricing.sale_price
                  ? pricing.sale_price
                  : pricing.regular_price;

                invoiceItem.bundleId = itemDto.itemId;
                invoiceItem.bundle = bundle;
                invoiceItem.itemTitle = bundle.title;
                invoiceItem.price = price;
                invoiceItem.creatorId = bundle.created_by; // This is a string
                invoiceItem.thumbnailUrl = bundle.thumbnail_url;
              }

              return invoiceItem;
            })
          );

          await queryRunner.manager.save(InvoiceItem, invoiceItems);
          invoice.items = invoiceItems;
        } else {
          invoice.items = [];
        }
      }

      // Recalculate totals
      invoice.calculateTotals();
      const updatedInvoice = await queryRunner.manager.save(Invoice, invoice);

      await queryRunner.commitTransaction();

      // Reload with relations
      const finalInvoice = await this.invoiceRepository.findOne({
        where: { id },
        relations: [
          'items',
          'items.course',
          'items.bundle',
          'items.creator',
          'createdByUser',
          'items.course.pricings',
          'items.bundle.pricings'
        ]
      });

      return this.mapToResponseDto(finalInvoice);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
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

    // Reload with relations
    const finalInvoice = await this.invoiceRepository.findOne({
      where: { id },
      relations: ['items', 'items.course', 'items.bundle', 'items.creator', 'createdByUser']
    });

    return this.mapToResponseDto(finalInvoice);
  }

  async duplicate(id: string, userId: string): Promise<InvoiceResponseDto> {
    const original = await this.invoiceRepository.findOne({
      where: { id, createdBy: userId },
      relations: ['items']
    });

    if (!original) {
      throw new NotFoundException('Invoice not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      // Create new invoice
      const newInvoice = new Invoice();
      newInvoice.invoiceNumber = await this.generateInvoiceNumber();
      newInvoice.invoiceDate = new Date();
      newInvoice.dueDate = new Date(); // Default due date
      newInvoice.paymentType = original.paymentType;
      newInvoice.status = InvoiceStatus.PENDING;
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

      // Copy rates
      newInvoice.discountRate = original.discountRate;
      newInvoice.taxRate = original.taxRate;

      newInvoice.notes = `Copy of ${original.invoiceNumber}\n${original.notes || ''}`;

      // Save the new invoice first
      const savedInvoice = await queryRunner.manager.save(newInvoice);

      // Copy items
      if (original.items && original.items.length > 0) {
        const newItems = original.items.map(item => {
          const newItem = new InvoiceItem();
          newItem.invoiceId = savedInvoice.id;
          newItem.itemType = item.itemType;
          newItem.courseId = item.courseId;
          newItem.bundleId = item.bundleId;
          newItem.creatorId = item.creatorId;
          newItem.itemTitle = item.itemTitle;
          newItem.price = item.price;
          newItem.quantity = item.quantity;
          newItem.currencyCode = item.currencyCode;
          newItem.thumbnailUrl = item.thumbnailUrl;
          return newItem;
        });

        await queryRunner.manager.save(InvoiceItem, newItems);
        savedInvoice.items = newItems;
      }

      // Calculate totals
      savedInvoice.calculateTotals();
      await queryRunner.manager.save(Invoice, savedInvoice);

      await queryRunner.commitTransaction();

      // Reload with relations
      const finalInvoice = await this.invoiceRepository.findOne({
        where: { id: savedInvoice.id },
        relations: ['items', 'items.course', 'items.bundle', 'items.creator', 'createdByUser']
      });

      return this.mapToResponseDto(finalInvoice);
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getStatistics(userId: string): Promise<any> {
    // Get all statistics in a more optimized way
    const today = new Date();

    // Single query for multiple aggregates
    const stats = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .select([
        'COUNT(*) as totalInvoices',
        'SUM(CASE WHEN invoice.status = :paid THEN invoice.total ELSE 0 END) as totalAmount',
        'SUM(CASE WHEN invoice.status = :pending THEN invoice.balanceDue ELSE 0 END) as pendingAmount',
        'SUM(CASE WHEN invoice.status = :draft THEN 1 ELSE 0 END) as draftCount',
        'SUM(CASE WHEN invoice.status = :pending THEN 1 ELSE 0 END) as pendingCount',
        'SUM(CASE WHEN invoice.status = :paid THEN 1 ELSE 0 END) as paidCount',
        'SUM(CASE WHEN invoice.status = :pending AND invoice.dueDate < :today THEN 1 ELSE 0 END) as overdueCount'
      ])
      .where('invoice.createdBy = :userId', { userId })
      .setParameters({
        userId,
        paid: InvoiceStatus.PAID,
        pending: InvoiceStatus.PENDING,
        draft: InvoiceStatus.DRAFT,
        today
      })
      .getRawOne();

    return {
      totalInvoices: parseInt(stats?.totalinvoices || '0', 10) || 0,
      totalAmount: parseFloat(stats?.totalamount || '0') || 0,
      pendingAmount: parseFloat(stats?.pendingamount || '0') || 0,
      overdueInvoices: parseInt(stats?.overduecount || '0', 10) || 0,
      statusDistribution: {
        draft: parseInt(stats?.draftcount || '0', 10) || 0,
        pending: parseInt(stats?.pendingcount || '0', 10) || 0,
        paid: parseInt(stats?.paidcount || '0', 10) || 0,
        overdue: parseInt(stats?.overduecount || '0', 10) || 0,
      }
    };
  }

  private mapToResponseDto(invoice: Invoice): InvoiceResponseDto {
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    // Transform items to match InvoiceItemResponseDto structure
    const items = invoice.items ? invoice.items.map(item => {
      const unitPrice = item.price;
      const itemTotalPrice = unitPrice * item.quantity;

      // Get item-specific pricing info
      let pricingInfo = null;
      if (item.itemType === InvoiceItemType.COURSE && item.course?.pricings) {
        pricingInfo = item.course.pricings.find(p => p.currencyCode === item.currencyCode);
      } else if (item.itemType === InvoiceItemType.BUNDLE && item.bundle?.pricings) {
        pricingInfo = item.bundle.pricings.find(p => p.currency_code === item.currencyCode);
      }

      // Calculate proportional discount and tax for this item
      // Only calculate if subtotal > 0 to avoid division by zero
      let discountAmount = 0;
      let taxAmount = 0;

      if (invoice.subtotal > 0) {
        // Calculate item's proportion of the invoice subtotal
        const itemProportion = itemTotalPrice / invoice.subtotal;

        // Distribute invoice-level discount proportionally to this item
        discountAmount = invoice.totalDiscount * itemProportion;

        // Calculate tax on item's price after its share of discount
        const itemPriceAfterDiscount = itemTotalPrice - discountAmount;
        taxAmount = itemPriceAfterDiscount * (invoice.taxRate / 100);
      }

      return {
        id: item.id,
        description: item.itemTitle,
        unitPrice: unitPrice,
        quantity: item.quantity,
        totalPrice: itemTotalPrice,
        taxRate: invoice.taxRate, // Invoice-level tax rate
        taxAmount: taxAmount,
        discountRate: invoice.discountRate, // Invoice-level discount rate
        discountAmount: discountAmount,
        createdAt: item.created_at,
        // Additional metadata that might be useful
        itemType: item.itemType,
        currencyCode: item.currencyCode,
        courseId: item.courseId,
        bundleId: item.bundleId,
        creatorId: item.creatorId,
        thumbnailUrl: item.thumbnailUrl,
        // Pricing info if needed
        pricingInfo: pricingInfo ? {
          regularPrice: pricingInfo.regularPrice || pricingInfo.regular_price,
          salePrice: pricingInfo.salePrice || pricingInfo.sale_price,
          discountEnabled: pricingInfo.discountEnabled || pricingInfo.discount_enabled,
          discountAmount: pricingInfo.discountAmount || pricingInfo.discount_amount
        } : undefined
      };
    }) : [];

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
      discountRate: invoice.discountRate,
      totalDiscount: invoice.totalDiscount,
      taxRate: invoice.taxRate,
      totalTax: invoice.totalTax,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      createdBy: invoice.createdBy,
      items: items,
      notes: invoice.notes,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
      isOverdue: invoice.isOverdue(),
      daysUntilDue: daysUntilDue,
      creatorName: invoice.createdByUser?.profile ?
        `${invoice.createdByUser.profile.firstName} ${invoice.createdByUser.profile.lastName}` :
        invoice.createdByUser?.email,
      creatorEmail: invoice.createdByUser?.email
    };
  }
}