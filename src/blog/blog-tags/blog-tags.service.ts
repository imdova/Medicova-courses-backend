import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogTag } from './entities/blog-tag.entity'; // Adjust path as needed
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { UpdateBlogTagDto } from './dto/update-blog-tag.dto';
import { Blog } from '../entities/blog.entity';
import { QueryConfig } from 'src/common/utils/query-options';
import { FilterOperator, paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { ImportResult } from './dto/import-blog-tags.dto';
import * as XLSX from 'xlsx';

export const blog_TAG_PAGINATION_CONFIG: QueryConfig<BlogTag> = {
  // Allows sorting by database columns
  sortableColumns: ['created_at', 'name', 'slug', 'isActive'],

  // Default sorting rule
  defaultSortBy: [['name', 'ASC']],

  // Columns that can be filtered
  filterableColumns: {
    name: [FilterOperator.ILIKE], // Case-insensitive search
    slug: [FilterOperator.EQ],
    isActive: [FilterOperator.EQ], // Filter by status
  },

  relations: [],
};

interface blogTagWithCount extends BlogTag {
  blogsCount: number;
}

interface ParsedTagRow {
  name: string;
  slug: string;
  description?: string;
  color: string;
  isActive: boolean;
}

@Injectable()
export class BlogTagsService {
  constructor(
    @InjectRepository(BlogTag)
    private blogTagRepository: Repository<BlogTag>,
    @InjectRepository(Blog)
    private blogRepository: Repository<Blog>,
  ) { }

  /**
   * Creates a new tag, ensuring slug and name are unique.
   */
  async create(createblogTagDto: CreateBlogTagDto): Promise<BlogTag> {
    // Create the entity instance
    const tag = this.blogTagRepository.create(createblogTagDto);

    try {
      return await this.blogTagRepository.save(tag);
    } catch (error) {
      // Check for unique constraint violation (code '23505' in PostgreSQL)
      if ((error as any).code === '23505') {
        if ((error as any).detail.includes('name')) {
          throw new ConflictException(`Tag name '${createblogTagDto.name}' already exists.`);
        }
        if ((error as any).detail.includes('slug')) {
          throw new ConflictException(`Tag slug '${createblogTagDto.slug}' already exists.`);
        }
      }
      throw error;
    }
  }

  /**
 * 🚀 Retrieves all blog tags with blog counts
 * Optimized version using QueryBuilder with subquery
 */
  async findAll(query: PaginateQuery): Promise<Paginated<blogTagWithCount>> {
    // 1. Initialize the QueryBuilder for the base entity (blogTag)
    const qb = this.blogTagRepository.createQueryBuilder('tag');

    // 2. Use the 'paginate' utility to apply standard pagination, sorting, and filtering
    // This calculates total count and modifies 'qb' with WHERE/ORDER BY/LIMIT/OFFSET clauses.
    const paginated = await paginate<BlogTag>(query, qb, blog_TAG_PAGINATION_CONFIG);

    // 3. Extract final pagination parameters from the result meta
    const offset = (paginated.meta.currentPage - 1) * paginated.meta.itemsPerPage;
    const limit = paginated.meta.itemsPerPage;

    // 4. Re-run the QueryBuilder to fetch the actual paginated data 
    //    AND the computed 'blogsCount' aggregate.
    // NOTE: We must use getRawAndEntities() when mixing entity selection with addSelect for aggregates.
    const { entities, raw } = await qb
      .select([
        'tag.id',
        'tag.name',
        'tag.slug',
        'tag.description',
        'tag.color',
        'tag.isActive',
      ])
      // Add subquery to count blogs containing this tag
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(blog.id)')
          .from(Blog, 'blog')
          // CRITICAL: Check if the blog's tags array contains the current tag's name
          .where('blog.tags @> ARRAY[tag.name]::text[]')
          // Only count published and active blogs
          .andWhere('blog.isActive = :isActive', { isActive: true })
          .andWhere('blog.deleted_at IS NULL');
      }, 'blogsCount')
      // Apply the LIMIT/OFFSET calculated by the paginate utility
      .offset(offset)
      .limit(limit)
      .getRawAndEntities();

    // 5. Merge aggregates from 'raw' into 'entities'
    const data: blogTagWithCount[] = entities.map((tag, i) => ({
      // Use the entity properties which are correctly mapped by TypeORM
      ...tag,
      // Add the computed property from the raw result
      blogsCount: Number(raw[i]?.blogsCount ?? 0),
    }));

    // 6. Return the final paginated result
    return {
      ...paginated, // Keep the original meta and links calculated by paginate
      data: data,    // Override the data with our merged, augmented data
    } as Paginated<blogTagWithCount>;
  }

  /**
   * Retrieves a single tag by ID (UUID).
   */
  async findOne(id: string): Promise<BlogTag> {
    const tag = await this.blogTagRepository.findOneBy({ id });

    if (!tag) {
      throw new NotFoundException(`blog tag with ID ${id} not found.`);
    }
    return tag;
  }

  /**
   * Updates an existing tag, maintaining uniqueness checks.
   */
  async update(id: string, updateblogTagDto: UpdateBlogTagDto): Promise<BlogTag> {
    const existingTag = await this.findOne(id); // Use findOne to ensure existence

    // Apply updates to the existing tag entity
    Object.assign(existingTag, updateblogTagDto);

    try {
      return await this.blogTagRepository.save(existingTag);
    } catch (error) {
      // Check for unique constraint violation on save
      if ((error as any).code === '23505') {
        if ((error as any).detail.includes('name')) {
          throw new ConflictException(`Tag name '${updateblogTagDto.name}' already exists.`);
        }
        if ((error as any).detail.includes('slug')) {
          throw new ConflictException(`Tag slug '${updateblogTagDto.slug}' already exists.`);
        }
      }
      throw error;
    }
  }

  /**
   * Deletes a tag by ID.
   */
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.blogTagRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`blog tag with ID ${id} not found.`);
    }

    return { message: `Tag with ID ${id} successfully deleted.` };
  }

  /**
   * Bulk import tags from XLSX/CSV file
   */
  async importFromFile(file: Express.Multer.File): Promise<ImportResult> {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Parse the file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!jsonData || jsonData.length === 0) {
        throw new BadRequestException('File is empty or has no valid data');
      }

      // Process each row
      for (let i = 0; i < jsonData.length; i++) {
        const rowNum = i + 2; // +2 because Excel rows start at 1 and we have a header
        const row = jsonData[i];

        try {
          // Parse and validate the row
          const parsedTag = this.parseTagRow(row, rowNum);

          // Create the tag
          const tag = this.blogTagRepository.create(parsedTag);
          await this.blogTagRepository.save(tag);

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            name: row.name || 'Unknown',
            error: error.message || 'Unknown error',
          });
        }
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to process file: ${error.message}`);
    }
  }

  /**
   * Parse and validate a single row from the import file
   */
  private parseTagRow(row: any, rowNum: number): ParsedTagRow {
    // Validate required fields
    if (!row.name || typeof row.name !== 'string' || row.name.trim() === '') {
      throw new Error('Name is required and must be a non-empty string');
    }

    if (!row.slug || typeof row.slug !== 'string' || row.slug.trim() === '') {
      throw new Error('Slug is required and must be a non-empty string');
    }

    if (!row.color || typeof row.color !== 'string' || row.color.trim() === '') {
      throw new Error('Color is required and must be a non-empty string');
    }

    // Validate field lengths
    if (row.name.length > 50) {
      throw new Error('Name must not exceed 50 characters');
    }

    if (row.slug.length > 50) {
      throw new Error('Slug must not exceed 50 characters');
    }

    if (row.color.length > 20) {
      throw new Error('Color must not exceed 20 characters');
    }

    if (row.description && row.description.length > 255) {
      throw new Error('Description must not exceed 255 characters');
    }

    // Parse isActive (handle various formats: true/false, 1/0, "true"/"false", "yes"/"no")
    let isActive = true; // Default to true
    if (row.isActive !== undefined && row.isActive !== null) {
      const activeStr = String(row.isActive).toLowerCase().trim();
      if (activeStr === 'false' || activeStr === '0' || activeStr === 'no' || activeStr === 'n') {
        isActive = false;
      } else if (activeStr === 'true' || activeStr === '1' || activeStr === 'yes' || activeStr === 'y') {
        isActive = true;
      } else {
        throw new Error(`Invalid isActive value: "${row.isActive}". Use true/false, 1/0, yes/no`);
      }
    }

    return {
      name: row.name.trim(),
      slug: row.slug.trim(),
      description: row.description ? String(row.description).trim() : undefined,
      color: row.color.trim(),
      isActive,
    };
  }
}