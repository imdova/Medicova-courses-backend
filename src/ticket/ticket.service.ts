// src/tickets/tickets.service.ts

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Ticket, TicketStatus } from './entities/ticket.entity';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { QueryConfig } from 'src/common/utils/query-options';
import { UpdateTicketDto } from './dto/update-ticket.dto';

// Define the assumed Admin role (adjust based on your system's actual roles)
const ADMIN_ROLES = ['admin'];

export const TICKET_PAGINATION_CONFIG: QueryConfig<Ticket> = {
  sortableColumns: [
    'created_at',
    'updated_at',
    'title',
    'priority',
    'status',
  ],
  defaultSortBy: [['created_at', 'DESC']],
  searchableColumns: ['title', 'description'], // Allows ILIKE search across title and description
  filterableColumns: {
    title: [FilterOperator.ILIKE],
    status: [FilterOperator.EQ],
    priority: [FilterOperator.EQ],
    subject: [FilterOperator.EQ],
  },
};

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) { }

  /**
   * Creates a new support ticket initiated by a user.
   * @param userId The ID of the user creating the ticket.
   * @param createTicketDto The data for the new ticket.
   * @returns The newly created Ticket entity.
   */
  async createTicket(userId: string, createTicketDto: CreateTicketDto): Promise<Ticket> {
    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      createdBy: userId,
      status: TicketStatus.OPEN, // Always start as Open
    });

    return this.ticketRepository.save(ticket);
  }

  /**
   * Fetches tickets, filtering based on the user's role.
   * Admins/Staff see all tickets. Clients see only their own.
   * @param userId The ID of the authenticated user.
   * @param userRole The role of the authenticated user.
   * @param query Pagination and filtering query parameters.
   * @returns A paginated list of Ticket entities.
   */
  async findAllTicketsByRole(userId: string, userRole: string, query: PaginateQuery): Promise<any> {
    const isAdmin = ADMIN_ROLES.includes(userRole);

    // 1. Start a QueryBuilder, aliasing the table as 'ticket'
    const queryBuilder = this.ticketRepository.createQueryBuilder('ticket');

    // 2. Apply Base WHERE Condition using QueryBuilder (Crucial Fix)
    if (!isAdmin) {
      // For clients, explicitly add the authorization WHERE clause
      queryBuilder.where('ticket.createdBy = :userId', { userId });
    }

    // 3. Call paginate with the QueryBuilder and the configuration.
    // When passing a QueryBuilder, the 'where' property in TICKET_PAGINATION_CONFIG 
    // is ignored, as the WHERE clause is already controlled by the QueryBuilder.
    return paginate(query, queryBuilder, TICKET_PAGINATION_CONFIG);
  }

  /**
   * Fetches a single ticket, ensuring the user has authorization.
   * @param userId The ID of the authenticated user.
   * @param userRole The role of the authenticated user.
   * @param ticketId The ID of the ticket to fetch.
   * @returns The Ticket entity.
   */
  async findOneTicketByRole(userId: string, userRole: string, ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      // Optionally load the creator's details if needed
      // relations: ['user'] 
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found.`);
    }

    const isAdmin = ADMIN_ROLES.includes(userRole);

    // Authorization check: If not admin AND the ticket was not created by this user
    if (!isAdmin && ticket.createdBy !== userId) {
      throw new ForbiddenException('You do not have permission to view this ticket.');
    }

    return ticket;
  }

  /**
   * Admin-only method to update ticket status, priority, title, or description.
   * @param ticketId The ID of the ticket to update.
   * @param updateDto The data to update (e.g., status, priority).
   * @returns The updated Ticket entity.
   */
  async updateTicket(ticketId: string, updateDto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found.`);
    }

    // Apply updates
    Object.assign(ticket, updateDto);

    return this.ticketRepository.save(ticket);
  }

  /**
   * Helper method for Admin Controller to get a single ticket without role checks.
   * This is used by the PATCH endpoint in the controller.
   * @param ticketId The ID of the ticket.
   * @returns The Ticket entity.
   */
  async findOne(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketRepository.findOne({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found.`);
    }
    return ticket;
  }
}