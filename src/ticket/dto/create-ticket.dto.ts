// src/tickets/dto/ticket.dto.ts

import { IsString, IsNotEmpty, IsEnum, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { TicketPriority, TicketStatus, TicketSubject } from '../entities/ticket.entity';

// --- Ticket Creation DTO (For the User) ---
export class CreateTicketDto {
    @ApiProperty({ description: 'The subject or title of the support ticket.' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @ApiPropertyOptional({ description: 'The detailed description of the issue or request.' })
    @IsString()
    description: string;

    @ApiProperty({ description: 'The main subject or topic of the ticket.', enum: TicketSubject })
    @IsEnum(TicketSubject)
    @IsNotEmpty()
    subject: TicketSubject; // 🟢 NEW FIELD

    @ApiProperty({ description: 'The priority level the user assigns to the ticket.', enum: TicketPriority, default: TicketPriority.MEDIUM, required: false })
    @IsOptional()
    @IsEnum(TicketPriority)
    priority?: TicketPriority;

    @ApiProperty({ description: 'The new status of the ticket.', enum: TicketStatus })
    @IsOptional()
    @IsEnum(TicketStatus)
    status?: TicketStatus;
}
