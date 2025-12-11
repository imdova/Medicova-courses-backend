// invoice.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { InvoiceStatus } from './entities/invoice.entity';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard';

interface RequestWithUser extends Request {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@ApiTags('Invoices')
@ApiBearerAuth('access_token')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created', type: InvoiceResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Req() req
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.create(createInvoiceDto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all invoices for the current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(
    @Req() req,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: InvoiceStatus,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.invoiceService.findAll(
      req.user.sub,
      page,
      limit,
      status,
      search,
      startDate,
      endDate
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get invoice statistics for the current user' })
  getStatistics(@Req() req) {
    return this.invoiceService.getStatistics(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice found', type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.findOne(id, req.user.sub);
  }

  @Get('number/:invoiceNumber')
  @ApiOperation({ summary: 'Get invoice by invoice number' })
  findByInvoiceNumber(
    @Param('invoiceNumber') invoiceNumber: string,
    @Req() req
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.findByInvoiceNumber(invoiceNumber, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated', type: InvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Req() req
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.update(id, updateInvoiceDto, req.user.sub);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an existing invoice' })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.duplicate(id, req.user.sub);
  }

  @Post(':id/mark-paid')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiQuery({ name: 'amount', required: false, type: Number })
  markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
    @Query('amount') amount?: number
  ): Promise<InvoiceResponseDto> {
    return this.invoiceService.markAsPaid(id, req.user.sub, amount);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete invoice' })
  @ApiResponse({ status: 200, description: 'Invoice deleted' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete paid invoice' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req
  ): Promise<void> {
    return this.invoiceService.remove(id, req.user.sub);
  }
}