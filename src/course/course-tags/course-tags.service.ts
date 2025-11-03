import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseTag } from './entities/course-tags.entity'; // Adjust path as needed
import { CreateCourseTagDto } from './dto/create-course-tag.dto';
import { UpdateCourseTagDto } from './dto/update-course-tag.dto';
import { Course } from '../entities/course.entity';
import { QueryConfig } from 'src/common/utils/query-options';
import { FilterOperator, paginate, Paginated, PaginateQuery } from 'nestjs-paginate';

export const COURSE_TAG_PAGINATION_CONFIG: QueryConfig<CourseTag> = {
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

interface CourseTagWithCount extends CourseTag {
  coursesCount: number;
}

@Injectable()
export class CourseTagsService {
  constructor(
    @InjectRepository(CourseTag)
    private courseTagRepository: Repository<CourseTag>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) { }

  /**
   * Creates a new tag, ensuring slug and name are unique.
   */
  async create(createCourseTagDto: CreateCourseTagDto): Promise<CourseTag> {
    // Create the entity instance
    const tag = this.courseTagRepository.create(createCourseTagDto);

    try {
      return await this.courseTagRepository.save(tag);
    } catch (error) {
      // Check for unique constraint violation (code '23505' in PostgreSQL)
      if ((error as any).code === '23505') {
        if ((error as any).detail.includes('name')) {
          throw new ConflictException(`Tag name '${createCourseTagDto.name}' already exists.`);
        }
        if ((error as any).detail.includes('slug')) {
          throw new ConflictException(`Tag slug '${createCourseTagDto.slug}' already exists.`);
        }
      }
      throw error;
    }
  }

  /**
 * 🚀 Retrieves all course tags with course counts
 * Optimized version using QueryBuilder with subquery
 */
  async findAll(query: PaginateQuery): Promise<Paginated<CourseTagWithCount>> {
    // 1. Initialize the QueryBuilder for the base entity (CourseTag)
    const qb = this.courseTagRepository.createQueryBuilder('tag');

    // 2. Use the 'paginate' utility to apply standard pagination, sorting, and filtering
    // This calculates total count and modifies 'qb' with WHERE/ORDER BY/LIMIT/OFFSET clauses.
    const paginated = await paginate<CourseTag>(query, qb, COURSE_TAG_PAGINATION_CONFIG);

    // 3. Extract final pagination parameters from the result meta
    const offset = (paginated.meta.currentPage - 1) * paginated.meta.itemsPerPage;
    const limit = paginated.meta.itemsPerPage;

    // 4. Re-run the QueryBuilder to fetch the actual paginated data 
    //    AND the computed 'coursesCount' aggregate.
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
      // Add subquery to count courses containing this tag
      .addSelect((subQuery) => {
        return subQuery
          .select('COUNT(course.id)')
          .from(Course, 'course')
          // CRITICAL: Check if the course's tags array contains the current tag's name
          .where('course.tags @> ARRAY[tag.name]::text[]')
          // Only count published and active courses
          .andWhere('course.status = :status', { status: 'published' })
          .andWhere('course.isActive = :isActive', { isActive: true })
          .andWhere('course.deleted_at IS NULL');
      }, 'coursesCount')
      // Apply the LIMIT/OFFSET calculated by the paginate utility
      .offset(offset)
      .limit(limit)
      .getRawAndEntities();

    // 5. Merge aggregates from 'raw' into 'entities'
    const data: CourseTagWithCount[] = entities.map((tag, i) => ({
      // Use the entity properties which are correctly mapped by TypeORM
      ...tag,
      // Add the computed property from the raw result
      coursesCount: Number(raw[i]?.coursesCount ?? 0),
    }));

    // 6. Return the final paginated result
    return {
      ...paginated, // Keep the original meta and links calculated by paginate
      data: data,    // Override the data with our merged, augmented data
    } as Paginated<CourseTagWithCount>;
  }

  /**
   * Retrieves a single tag by ID (UUID).
   */
  async findOne(id: string): Promise<CourseTag> {
    const tag = await this.courseTagRepository.findOneBy({ id });

    if (!tag) {
      throw new NotFoundException(`Course tag with ID ${id} not found.`);
    }
    return tag;
  }

  /**
   * Updates an existing tag, maintaining uniqueness checks.
   */
  async update(id: string, updateCourseTagDto: UpdateCourseTagDto): Promise<CourseTag> {
    const existingTag = await this.findOne(id); // Use findOne to ensure existence

    // Apply updates to the existing tag entity
    Object.assign(existingTag, updateCourseTagDto);

    try {
      return await this.courseTagRepository.save(existingTag);
    } catch (error) {
      // Check for unique constraint violation on save
      if ((error as any).code === '23505') {
        if ((error as any).detail.includes('name')) {
          throw new ConflictException(`Tag name '${updateCourseTagDto.name}' already exists.`);
        }
        if ((error as any).detail.includes('slug')) {
          throw new ConflictException(`Tag slug '${updateCourseTagDto.slug}' already exists.`);
        }
      }
      throw error;
    }
  }

  /**
   * Deletes a tag by ID.
   */
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.courseTagRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Course tag with ID ${id} not found.`);
    }

    return { message: `Tag with ID ${id} successfully deleted.` };
  }
}