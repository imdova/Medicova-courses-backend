// src/tickets/tickets.controller.ts

import { Controller, Get, Post, Body, Patch, Param, UseGuards, Req, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { TicketsService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { Ticket, TicketPriority, TicketStatus, TicketSubject } from './entities/ticket.entity';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@ApiTags('Tickets')
@ApiBearerAuth('access_token')
@Controller('tickets')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) { }

  // -------------------------------------------------------------------
  // 1. Client & Admin: Create Ticket (User Role)
  // -------------------------------------------------------------------

  @Post()
  //@RequirePermissions('ticket:create')
  @ApiOperation({ summary: 'Create a new support ticket.' })
  @ApiResponse({ status: 201, type: Ticket })
  create(@Req() req, @Body() createTicketDto: CreateTicketDto) {
    const userId = req.user.sub;
    return this.ticketsService.createTicket(userId, createTicketDto);
  }

  // -------------------------------------------------------------------
  // 2. Client & Admin: List Tickets (Role-based logic in service)
  // -------------------------------------------------------------------

  @Get()
  //@RequirePermissions('ticket:list')
  @ApiOperation({
    summary: 'List tickets based on role (Client: only own tickets; Admin: all tickets).',
    description: 'Admins require `ticket:list` permission to fetch all tickets.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'filter.status',
    required: false,
    enum: TicketStatus,
    example: TicketStatus.OPEN
  })
  @ApiQuery({
    name: 'filter.subject',
    required: false,
    enum: TicketSubject,
    example: TicketSubject.TECHNICAL_SUPPORT
  })
  @ApiQuery({
    name: 'filter.priority',
    required: false,
    enum: TicketPriority,
    example: TicketPriority.MEDIUM
  })
  @ApiQuery({
    name: 'filter.title',
    required: false,
    type: String
  })
  @ApiResponse({ status: 200 })
  findAll(@Req() req, @Paginate() query: PaginateQuery) {
    const userId = req.user.sub;
    const userRole = req.user.role;

    return this.ticketsService.findAllTicketsByRole(userId, userRole, query);
  }

  // -------------------------------------------------------------------
  // 3. Client & Admin: Get Specific Ticket (Role-based logic in service)
  // -------------------------------------------------------------------

  @Get(':ticketId')
  //@RequirePermissions('ticket:get_by_id')
  @ApiOperation({ summary: 'Get a specific ticket (Admin sees all; Client sees only own).' })
  @ApiParam({ name: 'ticketId', type: String, description: 'UUID of the Ticket' })
  @ApiResponse({ status: 200, type: Ticket })
  findOne(@Req() req, @Param('ticketId') ticketId: string) {
    const userId = req.user.sub;
    const userRole = req.user.role;

    return this.ticketsService.findOneTicketByRole(userId, userRole, ticketId);
  }

  // -------------------------------------------------------------------
  // 4. Admin: Update Status/Priority
  // -------------------------------------------------------------------

  @Patch(':ticketId')
  //@RequirePermissions('ticket:update')
  @ApiOperation({ summary: 'Admin: Update ticket status and/or priority.' })
  @ApiParam({ name: 'ticketId', type: String, description: 'UUID of the Ticket' })
  @ApiResponse({ status: 200, type: Ticket })
  updateStatus(@Param('ticketId') ticketId: string, @Body() updateDto: UpdateTicketDto, @Req() req) {
    if (req.user.role !== 'admin') {
      throw new NotFoundException(`Only Admin can edit tickets`);
    }
    return this.ticketsService.updateTicket(ticketId, updateDto);
  }
}