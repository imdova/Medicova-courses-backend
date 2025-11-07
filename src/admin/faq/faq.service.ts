// src/faq/faq.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFaqDto } from './dto/create-faq.dto';
import { Faq, FaqCategory, FaqStatus } from './entities/faq.entity'; // Assuming location and entity name
import { UpdateFaqDto } from './dto/update-faq.dto';
import { QueryConfig } from 'src/common/utils/query-options';
import { paginate, PaginateQuery } from 'nestjs-paginate';

export const FAQ_PAGINATION_CONFIG: QueryConfig<Faq> = {
  sortableColumns: ['status', 'created_at'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    category: true,
    status: true,
  },
  relations: [],
};

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private faqRepository: Repository<Faq>,
  ) { }

  /**
   * Creates a new FAQ item.
   * @param createFaqDto DTO containing new FAQ data.
   * @param createdById The UUID of the admin creating the FAQ.
   * @returns The created Faq entity.
   */
  async create(createFaqDto: CreateFaqDto): Promise<Faq> {
    const newFaq = this.faqRepository.create({
      ...createFaqDto,
    });

    return this.faqRepository.save(newFaq);
  }

  /**
      * Retrieves a paginated, filtered, and sorted list of FAQs.
      */
  async findAll(query: PaginateQuery): Promise<any> {
    // ✅ Use the generic paginate function provided by your library
    return paginate(query, this.faqRepository, FAQ_PAGINATION_CONFIG);
  }

  /**
   * Finds a single FAQ by its UUID.
   */
  async findOne(id: string): Promise<Faq> {
    const faq = await this.faqRepository.findOne({ where: { id } });

    if (!faq) {
      throw new NotFoundException(`FAQ with ID "${id}" not found.`);
    }
    return faq;
  }

  /**
   * Updates an existing FAQ by its UUID.
   */
  async update(id: string, updateFaqDto: UpdateFaqDto): Promise<Faq> {
    const result = await this.faqRepository.update(id, updateFaqDto);

    if (result.affected === 0) {
      throw new NotFoundException(`FAQ with ID "${id}" not found.`);
    }

    // Return the updated entity
    return this.findOne(id);
  }

  /**
   * Soft deletes an FAQ by its UUID.
   */
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.faqRepository.softDelete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`FAQ with ID "${id}" not found.`);
    }

    return { message: `FAQ with ID "${id}" successfully deleted.` };
  }
}