// src/testimonials/testimonial.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { Testimonial, TestimonialStatus } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { QueryConfig } from 'src/common/utils/query-options';

export const TESTIMONIAL_PAGINATION_CONFIG: QueryConfig<Testimonial> = {
  sortableColumns: [
    'created_at',
    'titleEn',
    'status'
  ],
  defaultSortBy: [['created_at', 'DESC']],
  // Allows searching across all multilingual title and content fields
  searchableColumns: [
    'titleEn',
    'titleAr',
    'descriptionEn',
    'descriptionAr',
    'contentEn',
    'contentAr'
  ],
  filterableColumns: {
    status: [FilterOperator.EQ],
  },
};

@Injectable()
export class TestimonialService {
  constructor(
    @InjectRepository(Testimonial)
    private readonly testimonialRepository: Repository<Testimonial>,
  ) { }

  /**
   * Creates a new testimonial, setting the creator and default status to DRAFT.
   * @param userId The ID of the authenticated user submitting the testimonial.
   */
  async create(userId: string, createTestimonialDto: CreateTestimonialDto): Promise<Testimonial> {
    const testimonial = this.testimonialRepository.create({
      ...createTestimonialDto,
      createdBy: userId, // 🔑 FIX: Set the creator ID
      status: TestimonialStatus.DRAFT // Ensure it starts as DRAFT
    });
    return this.testimonialRepository.save(testimonial);
  }

  // -----------------------------------------------------
  // Public Access
  // -----------------------------------------------------

  /**
   * Retrieves a paginated list of ONLY PUBLISHED testimonials (Public endpoint).
   */
  async findAllPublished(query: PaginateQuery): Promise<any> {
    return paginate(query, this.testimonialRepository, {
      ...TESTIMONIAL_PAGINATION_CONFIG,
      // Apply mandatory filter for PUBLISHED status
      where: { status: TestimonialStatus.PUBLISHED },
    });
  }

  // -----------------------------------------------------
  // Admin Access
  // -----------------------------------------------------

  /**
   * Retrieves a paginated list of ALL testimonials (Admin endpoint).
   */
  async findAllAdmin(query: PaginateQuery): Promise<any> {
    // Admin sees all testimonials regardless of status, using the base config
    return paginate(query, this.testimonialRepository, TESTIMONIAL_PAGINATION_CONFIG);
  }

  /**
   * Retrieves a single testimonial by ID.
   */
  async findOne(id: string): Promise<Testimonial> {
    const testimonial = await this.testimonialRepository.findOne({ where: { id } });
    if (!testimonial) {
      throw new NotFoundException(`Testimonial with ID ${id} not found.`);
    }
    return testimonial;
  }

  /**
   * Updates an existing testimonial.
   */
  async update(id: string, updateTestimonialDto: UpdateTestimonialDto): Promise<Testimonial> {
    const testimonial = await this.findOne(id);

    // Apply updates (including status change) and save
    Object.assign(testimonial, updateTestimonialDto);

    return this.testimonialRepository.save(testimonial);
  }

  /**
   * Soft deletes a testimonial.
   */
  async remove(id: string): Promise<{ deleted: boolean; message: string }> {
    const result = await this.testimonialRepository.softDelete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Testimonial with ID ${id} not found.`);
    }
    return { deleted: true, message: `Testimonial with ID ${id} has been soft-deleted.` };
  }
}