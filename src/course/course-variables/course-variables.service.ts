import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCourseVariableDto } from './dto/create-course-variable.dto';
import { UpdateCourseVariableDto } from './dto/update-course-variable.dto';
import { CourseVariable } from './entities/course-variable.entity';
import { QueryConfig } from 'src/common/utils/query-options';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, Paginated, PaginateQuery } from 'nestjs-paginate';

export const COURSE_VARIABLE_PAGINATION_CONFIG: QueryConfig<CourseVariable> = {
  sortableColumns: ['priority', 'displayName', 'type', 'isActive', 'created_at'],
  defaultSortBy: [['priority', 'ASC'], ['displayName', 'ASC']],
  filterableColumns: {}, // No filtering needed per current requirement
  relations: [],
};

@Injectable()
export class CourseVariablesService {
  constructor(
    @InjectRepository(CourseVariable)
    private courseVariableRepository: Repository<CourseVariable>,
  ) { }

  /**
   * Creates a new course variable.
   */
  async create(createCourseVariableDto: CreateCourseVariableDto): Promise<CourseVariable> {
    // Optional: Check for duplicate displayName or value if entity constraints aren't enough
    try {
      const newVariable = this.courseVariableRepository.create(createCourseVariableDto);
      return await this.courseVariableRepository.save(newVariable);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictException('Variable display name or value already exists.');
      }
      throw error;
    }
  }

  /**
   * Retrieves all course variables with simple pagination.
   */
  async findAll(query: PaginateQuery): Promise<Paginated<CourseVariable>> {
    const qb = this.courseVariableRepository.createQueryBuilder('variable');

    // Use the paginate utility to handle total count, page, limit, and default sorting
    // NOTE: Even without specific filters, this handles 'page' and 'limit'.
    return await paginate<CourseVariable>(query, qb, COURSE_VARIABLE_PAGINATION_CONFIG);
  }

  /**
   * Retrieves a single course variable by ID.
   */
  async findOne(id: string): Promise<CourseVariable> {
    const variable = await this.courseVariableRepository.findOne({ where: { id } });
    if (!variable) {
      throw new NotFoundException(`Course variable with ID "${id}" not found.`);
    }
    return variable;
  }

  /**
   * Updates an existing course variable.
   */
  async update(id: string, updateCourseVariableDto: UpdateCourseVariableDto): Promise<CourseVariable> {
    // Find the entity first to handle 404
    const existingVariable = await this.courseVariableRepository.findOne({ where: { id } });
    if (!existingVariable) {
      throw new NotFoundException(`Course variable with ID "${id}" not found.`);
    }

    // Apply updates
    this.courseVariableRepository.merge(existingVariable, updateCourseVariableDto);

    try {
      return await this.courseVariableRepository.save(existingVariable);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        throw new ConflictException('Updated display name or value already exists.');
      }
      throw error;
    }
  }

  /**
   * Deletes a course variable (soft delete).
   */
  async remove(id: string): Promise<{ message: string }> {
    const result = await this.courseVariableRepository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Course variable with ID "${id}" not found.`);
    }
    return { message: 'Variable successfully deleted.' };
  }
}
