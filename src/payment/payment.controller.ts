// payment.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { CheckoutCartDto } from './dto/checkout-cart.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { PaymentMethod } from './entities/payment.entity';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Payments')
@ApiBearerAuth('access_token')
@Controller('payments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  // ========== USER ENDPOINTS ==========

  @Post('cart/:cartId/checkout')
  @ApiOperation({ summary: 'Checkout a cart and create payment with transactions' })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart ID' })
  @ApiResponse({ status: 201, description: 'Payment and transactions created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid cart or payment method' })
  @ApiResponse({ status: 404, description: 'Cart not found' })
  async checkoutCart(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Body() checkoutCartDto: CheckoutCartDto,
    @Req() req,
  ) {
    return this.paymentService.createCartCheckout(req.user.sub, cartId, checkoutCartDto.paymentMethod);
  }

  @Post('cart/:cartId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm payment for a cart (webhook)' })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart ID' })
  @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Cart or pending payment not found' })
  async confirmPaymentByCart(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Req() req,
  ) {
    return this.paymentService.confirmPaymentByCart(cartId, req.user.sub);
  }

  // @Post('confirm/:paymentId')
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: 'Confirm a successful payment (webhook)' })
  // @ApiParam({ name: 'paymentId', type: String, description: 'Payment ID' })
  // @ApiResponse({ status: 200, description: 'Payment confirmed successfully' })
  // @ApiResponse({ status: 404, description: 'Payment not found' })
  // async confirmPayment(
  //   @Param('paymentId', ParseUUIDPipe) paymentId: string,
  //   @Body() confirmPaymentDto: ConfirmPaymentDto,
  // ) {
  //   return this.paymentService.confirmPayment(paymentId, confirmPaymentDto);
  // }

  @Post('cart/:cartId/cancel')
  @ApiOperation({ summary: 'Cancel pending payment for a cart' })
  @ApiParam({ name: 'cartId', type: String, description: 'Cart ID' })
  @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Cart or pending payment not found' })
  async cancelPaymentByCart(
    @Param('cartId', ParseUUIDPipe) cartId: string,
    @Req() req,
  ) {
    // Optional: Add user validation if needed
    return this.paymentService.cancelPaymentByCart(cartId, req.user.sub);
  }

  // @Post('cancel/:paymentId')
  // @ApiOperation({ summary: 'Cancel a pending payment' })
  // @ApiParam({ name: 'paymentId', type: String, description: 'Payment ID' })
  // @ApiResponse({ status: 200, description: 'Payment cancelled successfully' })
  // @ApiResponse({ status: 404, description: 'Payment not found' })
  // async cancelPayment(
  //   @Param('paymentId', ParseUUIDPipe) paymentId: string,
  //   @Req() req,
  // ) {
  //   return this.paymentService.cancelPayment(paymentId);
  // }

  @Get('my-payments')
  @ApiOperation({ summary: 'Get current user payment history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns user payment history' })
  async getMyPayments(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentService.getUserPayments(req.user.sub, page, limit);
  }

  @Get('my-transactions')
  @ApiOperation({ summary: 'Get current user transactions (as buyer)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns user transactions' })
  async getMyTransactions(
    @Req() req,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentService.getUserTransactions(req.user.sub, page, limit);
  }

  // ========== CREATOR ENDPOINTS ==========

  @Get('creator/earnings')
  @ApiOperation({ summary: 'Get creator earnings statistics' })
  @ApiResponse({ status: 200, description: 'Returns creator earnings stats' })
  async getCreatorEarnings(@Req() req) {
    return this.paymentService.getCreatorEarnings(req.user.sub);
  }

  @Get('creator/transactions')
  @ApiOperation({ summary: 'Get creator transactions (as seller)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PAID', 'REFUNDED', 'CANCELLED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns creator transactions' })
  async getCreatorTransactions(
    @Req() req,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.paymentService.getCreatorTransactions(req.user.sub, status, page, limit);
  }

  @Get('creator/top-items')
  @ApiOperation({ summary: 'Get creator top selling items' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns top selling items' })
  async getTopSellingItems(
    @Req() req,
    @Query('limit') limit = 10,
  ) {
    return this.paymentService.getCreatorTopSellingItems(req.user.sub, limit);
  }

  // ========== ADMIN ENDPOINTS ==========

  @Get('admin/stats')
  @RequirePermissions('payments:admin:stats')
  @ApiOperation({ summary: 'Get platform payment statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Returns platform stats' })
  async getPlatformStats() {
    return this.paymentService.getPlatformStats();
  }

  @Get('admin/payments')
  @RequirePermissions('payments:admin:list')
  @ApiOperation({ summary: 'Get all payments (Admin only)' })
  @ApiQuery({ name: 'method', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns all payments' })
  async getAllPayments(
    @Query('method') method?: PaymentMethod,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.paymentService.getAllPayments(method, status, page, limit);
  }
}