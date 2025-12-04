// src/tickets/entities/ticket.entity.ts

import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity'; // Assuming a User entity exists
import { BasicEntity } from 'src/common/entities/basic.entity';

export enum TicketStatus {
    OPEN = 'Open',
    RESOLVED = 'Resolved',
    CLOSED = 'Closed',
}

export enum TicketPriority {
    LOW = 'Low',
    MEDIUM = 'Medium',
    HIGH = 'High',
}

export enum TicketSubject {
    ACCOUNT_INQUIRY = 'Account Inquiry',
    BILLING_PAYMENTS = 'Billing/Payments',
    COURSE_ACCESS = 'Course Access Issue',
    TECHNICAL_SUPPORT = 'Technical Support (Bug)',
    FEATURE_REQUEST = 'Feature Request',
    CERTIFICATE_ISSUES = 'Certificate Issue',
    GENERAL_INQUIRY = 'General Inquiry',
    OTHER = 'Other',
}

@Entity('tickets')
export class Ticket extends BasicEntity {
    @ApiProperty({ description: 'A short, descriptive title for the ticket.' })
    @Column({ length: 255 })
    title: string;

    @ApiProperty({ description: 'The detailed description of the issue or request.' })
    @Column({ type: 'text' })
    description: string; // The content of the ticket

    // 🟢 NEW COLUMN: Ticket Subject
    @ApiProperty({ description: 'The main subject or topic of the ticket.', enum: TicketSubject })
    @Column({ type: 'enum', enum: TicketSubject })
    subject: TicketSubject;

    @ApiProperty({ description: 'The priority level of the ticket.' })
    @Column({ type: 'enum', enum: TicketPriority, default: TicketPriority.MEDIUM })
    priority: TicketPriority;

    @ApiProperty({ description: 'The current status of the ticket.' })
    @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.OPEN })
    status: TicketStatus;

    @ApiProperty({ description: 'The ID of the user who created the ticket.' })
    @Column({ type: 'uuid', name: 'created_by' })
    createdBy: string;

    // --- Relations ---

    @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'created_by' })
    user: User; // The creator of the ticket
}