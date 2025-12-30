import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalStatus } from './entities/withdrawal.entity';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';
import { CreateWithdrawalMethodDto } from './dto/create-withdrawal-method.dto';
import { UpdateWithdrawalMethodDto } from './dto/update-withdrawal-method.dto';

@ApiTags('Withdrawals')
@ApiBearerAuth('access_token')
@Controller('withdrawals')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) { }

  // ========== WALLET & METHODS ==========

  @Get('wallet')
  @ApiOperation({
    summary: 'Get creator wallet balance',
    description: 'Retrieves the current wallet balance summary including total earnings, available balance, and withdrawal statistics.'
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet balance retrieved successfully',
    schema: {
      example: {
        totalEarnings: 25000.75,
        availableBalance: 15000.25,
        pendingWithdrawals: 3000.50,
        totalWithdrawn: 7000.00,
        refundedAmount: 0.00,
        currency: 'EGP',
        lastUpdated: '2024-01-15T10:30:00.000Z'
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      example: {
        message: 'Unauthorized',
        statusCode: 401
      }
    }
  })
  async getWallet(@Req() req) {
    return this.withdrawalService.getCreatorWallet(req.user.sub);
  }

  @Get('available-methods')
  @ApiOperation({
    summary: 'Get available withdrawal methods',
    description: 'Lists all active withdrawal methods with their specifications, limits, and processing times.'
  })
  @ApiResponse({
    status: 200,
    description: 'Available methods retrieved successfully',
    schema: {
      example: [{
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Instapay',
        type: 'INSTAPAY',
        description: 'Instant transfer to Egyptian banks',
        iconUrl: 'https://example.com/instapay.png',
        minAmount: 100.00,
        maxAmount: 50000.00,
        feePercentage: 1.5,
        estimatedFee: 75.00,
        processingTime: 1,
        processingTimeUnit: 'HOURS',
        processingTimeText: '1 hours',
        isActive: true
      }]
    }
  })
  async getAvailableMethods() {
    return this.withdrawalService.getAvailableMethods();
  }

  // ========== WITHDRAWAL REQUESTS ==========

  @Post('request')
  @ApiOperation({
    summary: 'Request a withdrawal',
    description: 'Creates a new withdrawal request. The amount will be deducted from available balance and moved to pending status.'
  })
  @ApiBody({
    type: CreateWithdrawalDto,
    description: 'Withdrawal request details',
    examples: {
      instapay: {
        summary: 'Instapay Withdrawal',
        value: {
          withdrawalMethodId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 5000.00,
          metadata: {
            phoneNumber: '+201012345678'
          },
          currency: 'EGP'
        }
      },
      bankTransfer: {
        summary: 'Bank Transfer',
        value: {
          withdrawalMethodId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 10000.00,
          metadata: {
            bankName: 'CIB',
            accountNumber: '123456789',
            accountHolderName: 'John Doe',
            iban: 'EG12345678901234567890123456'
          },
          currency: 'EGP'
        }
      },
      paypal: {
        summary: 'PayPal Withdrawal',
        value: {
          withdrawalMethodId: '550e8400-e29b-41d4-a716-446655440002',
          amount: 500.00,
          metadata: {
            email: 'creator@example.com'
          },
          currency: 'USD'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal request created successfully',
    schema: {
      example: {
        id: '660e8400-e29b-41d4-a716-446655440000',
        creatorId: '770e8400-e29b-41d4-a716-446655440000',
        amount: 5000.00,
        currency: 'EGP',
        processingFee: 75.00,
        netAmount: 4925.00,
        status: 'PENDING',
        metadata: { phoneNumber: '+201012345678' },
        created_at: '2024-01-15T10:30:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid request or insufficient balance' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Withdrawal method not found' })
  async requestWithdrawal(
    @Req() req,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    return this.withdrawalService.requestWithdrawal(req.user.sub, createWithdrawalDto);
  }

  @Get('my-requests')
  @ApiOperation({
    summary: 'Get creator withdrawal requests',
    description: 'Retrieves paginated withdrawal history for the authenticated creator with optional filtering.'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WithdrawalStatus,
    description: 'Filter by withdrawal status'
  })
  @ApiQuery({
    name: 'methodId',
    required: false,
    type: String,
    description: 'Filter by withdrawal method ID'
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (YYYY-MM-DD)',
    example: '2024-01-01'
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (YYYY-MM-DD)',
    example: '2024-01-31'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
    example: 10
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal requests retrieved successfully',
    schema: {
      example: {
        withdrawals: [{
          id: '660e8400-e29b-41d4-a716-446655440000',
          created_at: '2024-01-15T10:30:00.000Z',
          amount: 5000.00,
          currency: 'EGP',
          processingFee: 75.00,
          netAmount: 4925.00,
          status: 'PENDING',
          metadata: { phoneNumber: '+201012345678' },
          processedAt: null,
          methodName: 'Instapay',
          methodType: 'INSTAPAY'
        }],
        pagination: {
          total: 15,
          page: 1,
          limit: 10,
          totalPages: 2
        }
      }
    }
  })
  async getMyWithdrawals(
    @Req() req,
    @Query('status') status?: WithdrawalStatus,
    @Query('methodId') methodId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    // Validate date format
    if (startDate && isNaN(Date.parse(startDate))) {
      throw new BadRequestException('Invalid startDate format. Use YYYY-MM-DD');
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      throw new BadRequestException('Invalid endDate format. Use YYYY-MM-DD');
    }

    return this.withdrawalService.getCreatorWithdrawals(req.user.sub, {
      status,
      methodId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });
  }

  // ========== ADMIN ENDPOINTS ==========

  @Get('admin/all')
  @ApiOperation({
    summary: 'Get all withdrawals (Admin only)',
    description: 'Admin endpoint to retrieve all withdrawal requests with filtering and pagination.'
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: WithdrawalStatus,
    description: 'Filter by withdrawal status'
  })
  @ApiQuery({
    name: 'methodId',
    required: false,
    type: String,
    description: 'Filter by withdrawal method ID'
  })
  @ApiQuery({
    name: 'creatorId',
    required: false,
    type: String,
    description: 'Filter by creator ID'
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering (YYYY-MM-DD)'
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering (YYYY-MM-DD)'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20, max: 100)',
    example: 20
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawals retrieved successfully'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('methodId') methodId?: string,
    @Query('creatorId') creatorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    // Validate date format
    if (startDate && isNaN(Date.parse(startDate))) {
      throw new BadRequestException('Invalid startDate format. Use YYYY-MM-DD');
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      throw new BadRequestException('Invalid endDate format. Use YYYY-MM-DD');
    }

    return this.withdrawalService.getAllWithdrawals({
      status,
      methodId,
      creatorId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: Number(page),
      limit: Math.min(Number(limit), 100),
    });
  }

  @Get('admin/:id')
  @ApiOperation({
    summary: 'Get withdrawal details (Admin only)',
    description: 'Retrieves detailed information about a specific withdrawal request including creator and processing details.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Withdrawal ID (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal details retrieved successfully'
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async getWithdrawalDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalService.getWithdrawalDetails(id);
  }

  @Put('admin/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update withdrawal status (Admin only)',
    description: 'Updates the status of a withdrawal request. Triggers notifications and payment processing when applicable.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Withdrawal ID (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: UpdateWithdrawalStatusDto,
    description: 'Status update details',
    examples: {
      approve: {
        summary: 'Approve and process',
        value: {
          status: 'COMPLETED',
        }
      },
      reject: {
        summary: 'Reject withdrawal',
        value: {
          status: 'REJECTED',
          rejectionReason: 'Invalid account details',
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Withdrawal status updated successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  async updateWithdrawalStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
    @Body() updateWithdrawalDto: UpdateWithdrawalStatusDto,
  ) {
    return this.withdrawalService.updateWithdrawalStatus(
      id,
      req.user.sub,
      updateWithdrawalDto,
    );
  }

  @Get('admin/stats')
  @ApiOperation({
    summary: 'Get withdrawal statistics (Admin only)',
    description: 'Retrieves comprehensive statistics about withdrawals including totals, fees, and method breakdowns.'
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        statusStats: [
          { status: 'COMPLETED', count: 150, totalAmount: 750000.50, totalFees: 11250.75 },
          { status: 'PENDING', count: 25, totalAmount: 125000.00, totalFees: 1875.00 }
        ],
        methodStats: [
          { methodName: 'Instapay', methodType: 'INSTAPAY', count: 100, totalAmount: 500000.00, totalFees: 7500.00 },
          { methodName: 'Bank Transfer', methodType: 'BANK_TRANSFER', count: 50, totalAmount: 250000.50, totalFees: 3750.75 }
        ],
        summary: {
          totalWithdrawn: 750000.50,
          totalFees: 11250.75,
          pendingCount: 25
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getWithdrawalStats() {
    return this.withdrawalService.getWithdrawalStats();
  }

  // ========== ADMIN WITHDRAWAL METHOD MANAGEMENT ==========

  @Post('admin/methods')
  @ApiOperation({
    summary: 'Create a new withdrawal method (Admin only)',
    description: 'Creates a new withdrawal method with specified limits, fees, and processing times.'
  })
  @ApiBody({
    type: CreateWithdrawalMethodDto,
    description: 'Withdrawal method configuration',
    examples: {
      instapay: {
        summary: 'Instapay Method',
        value: {
          name: 'Instapay',
          type: 'INSTAPAY',
          isActive: true,
          feePercentage: 1.5,
          processingTime: 1,
          processingTimeUnit: 'HOURS',
          minAmount: 100.00,
          maxAmount: 50000.00,
          iconUrl: 'https://example.com/instapay.png',
          description: 'Instant transfer to Egyptian banks via Instapay network'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Withdrawal method created successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid method data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 409, description: 'Method with this name already exists' })
  async createWithdrawalMethod(@Body() dto: CreateWithdrawalMethodDto) {
    return this.withdrawalService.createWithdrawalMethod(dto);
  }

  @Put('admin/methods/:id')
  @ApiOperation({
    summary: 'Update withdrawal method (Admin only)',
    description: 'Updates an existing withdrawal method configuration.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Method ID (UUID format)',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @ApiBody({
    type: UpdateWithdrawalMethodDto,
    description: 'Method update data',
    examples: {
      updateFees: {
        summary: 'Update fees',
        value: {
          feePercentage: 2.0,
          minAmount: 200.00,
          maxAmount: 100000.00,
          isActive: true
        }
      },
      deactivate: {
        summary: 'Deactivate method',
        value: {
          isActive: false,
          description: 'Temporarily disabled for maintenance'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Method updated successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Method not found' })
  async updateWithdrawalMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWithdrawalMethodDto,
  ) {
    return this.withdrawalService.updateWithdrawalMethod(id, dto);
  }
}