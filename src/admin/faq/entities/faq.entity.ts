import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasicEntity } from 'src/common/entities/basic.entity';

export enum FaqStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

export enum FaqCategory {
    ACCOUNT = 'Account',
    PAYMENTS = 'Payments',
    SHIPPING = 'Shipping',
    ORDERS = 'Orders',
    RETURNS = 'Returns',
}

@Entity('faqs')
export class Faq extends BasicEntity {
    // 🟢 ADDED: The FAQ Category field using the new enum
    @ApiProperty({
        enum: FaqCategory,
        description: 'The category the FAQ belongs to (e.g., Payments, Shipping).',
        example: FaqCategory.SHIPPING,
    })
    @Column({ type: 'enum', enum: FaqCategory })
    category: FaqCategory;

    // --- Multilingual Question Fields ---
    @ApiPropertyOptional({ description: 'Question in English', example: 'What is the refund policy?' })
    @Column({ type: 'text', name: 'question_en', nullable: true })
    questionEn: string;

    @ApiPropertyOptional({ description: 'Question in Arabic' })
    @Column({ type: 'text', name: 'question_ar', nullable: true })
    questionAr?: string;

    // --- Multilingual Answer (Rich Text/HTML) Fields ---
    @ApiPropertyOptional({ description: 'Answer content in English (Rich Text/HTML)' })
    @Column({ type: 'text', name: 'answer_en', nullable: true })
    answerEn: string;

    @ApiPropertyOptional({ description: 'Answer content in Arabic (Rich Text/HTML)' })
    @Column({ type: 'text', name: 'answer_ar', nullable: true })
    answerAr?: string;

    // --- Status and Priority ---
    @ApiProperty({
        enum: FaqStatus,
        description: 'Publishing status of the FAQ',
        default: FaqStatus.DRAFT,
    })
    @Column({ type: 'enum', enum: FaqStatus, default: FaqStatus.DRAFT })
    status: FaqStatus;
}