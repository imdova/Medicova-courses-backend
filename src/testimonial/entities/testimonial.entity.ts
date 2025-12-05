// src/testimonials/entities/testimonial.entity.ts

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';

export enum TestimonialStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

@Entity('testimonials')
export class Testimonial extends BasicEntity {
    @ApiProperty({ description: 'Testimonial title in English' })
    @Column({ type: 'text' })
    titleEn: string;

    @ApiPropertyOptional({ description: 'Testimonial title in Arabic' })
    @Column({ type: 'text', nullable: true })
    titleAr: string;

    @ApiPropertyOptional({ description: 'Testimonial description in English' })
    @Column({ type: 'text', nullable: true })
    descriptionEn: string;

    @ApiPropertyOptional({ description: 'Testimonial description in Arabic' })
    @Column({ type: 'text', nullable: true })
    descriptionAr: string;

    @ApiProperty({ description: 'Testimonial content in English (Rich Text/HTML)' })
    @Column({ type: 'text', nullable: true })
    contentEn: string;

    @ApiPropertyOptional({ description: 'Testimonial content in Arabic (Rich Text/HTML)' })
    @Column({ type: 'text', nullable: true })
    contentAr?: string;

    @ApiProperty({ description: 'The current publishing status of the testimonial.', enum: TestimonialStatus })
    @Column({ type: 'enum', enum: TestimonialStatus, default: TestimonialStatus.DRAFT })
    status: TestimonialStatus;

    // 🟢 NEW: Link to the User who submitted the testimonial
    @ApiProperty({ description: 'The ID of the user who submitted the testimonial.', format: 'uuid' })
    @Column({ type: 'uuid', name: 'created_by' })
    createdBy: string;

    @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'created_by' })
    user: User; // The user who submitted it
}