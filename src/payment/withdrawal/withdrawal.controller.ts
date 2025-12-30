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
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { WithdrawalService } from './withdrawal.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalStatus } from './entities/withdrawal.entity';
import { UpdateWithdrawalStatusDto } from './dto/update-withdrawal-status.dto';

@ApiTags('Withdrawals')
@ApiBearerAuth('access_token')
@Controller('withdrawals')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class WithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) { }

  // ========== WALLET & METHODS ==========

  @Get('wallet')
  @ApiOperation({ summary: 'Get creator wallet balance' })
  async getWallet(@Req() req) {
    return this.withdrawalService.getCreatorWallet(req.user.sub);
  }

  @Get('available-methods')
  @ApiOperation({ summary: 'Get available withdrawal methods' })
  @ApiQuery({ name: 'currency', required: false, type: String })
  async getAvailableMethods(@Query('currency') currency?: string) {
    return this.withdrawalService.getAvailableMethods(currency);
  }

  // ========== WITHDRAWAL REQUESTS ==========

  @Post('request')
  @ApiOperation({ summary: 'Request a withdrawal' })
  async requestWithdrawal(
    @Req() req,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    return this.withdrawalService.requestWithdrawal(req.user.sub, createWithdrawalDto);
  }

  @Get('my-requests')
  @ApiOperation({ summary: 'Get creator withdrawal requests' })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
  @ApiQuery({ name: 'methodId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMyWithdrawals(
    @Req() req,
    @Query('status') status?: WithdrawalStatus,
    @Query('methodId') methodId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.withdrawalService.getCreatorWithdrawals(req.user.sub, {
      status,
      methodId: methodId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
  }

  // ========== ADMIN ENDPOINTS ==========

  @Get('admin/all')
  @ApiOperation({ summary: 'Get all withdrawals (Admin only)' })
  @ApiQuery({ name: 'status', required: false, enum: WithdrawalStatus })
  @ApiQuery({ name: 'methodId', required: false, type: String })
  @ApiQuery({ name: 'creatorId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('methodId') methodId?: string,
    @Query('creatorId') creatorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.withdrawalService.getAllWithdrawals({
      status,
      methodId: methodId,
      creatorId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page,
      limit,
    });
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Get withdrawal details (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Withdrawal ID' })
  async getWithdrawalDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalService.getWithdrawalDetails(id);
  }

  @Put('admin/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update withdrawal status (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Withdrawal ID' })
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
  @ApiOperation({ summary: 'Get withdrawal statistics (Admin only)' })
  async getWithdrawalStats() {
    return this.withdrawalService.getWithdrawalStats();
  }

  // ========== ADMIN WITHDRAWAL METHOD MANAGEMENT ==========

  @Post('admin/methods')
  @ApiOperation({ summary: 'Create a new withdrawal method (Admin only)' })
  async createWithdrawalMethod(@Body() dto: any) {
    return this.withdrawalService.createWithdrawalMethod(dto);
  }

  @Put('admin/methods/:id')
  @ApiOperation({ summary: 'Update withdrawal method (Admin only)' })
  @ApiParam({ name: 'id', type: String, description: 'Method ID' })
  async updateWithdrawalMethod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ) {
    return this.withdrawalService.updateWithdrawalMethod(id, dto);
  }
}