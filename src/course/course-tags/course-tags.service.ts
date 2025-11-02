import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseTag } from '../entities/course-tags.entity'; // Adjust path as needed
import { CreateCourseTagDto } from './dto/create-course-tag.dto';
import { UpdateCourseTagDto } from './dto/update-course-tag.dto';

@Injectable()
export class CourseTagsService {
  constructor(
    @InjectRepository(CourseTag)
    private courseTagRepository: Repository<CourseTag>,
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
   * Retrieves all course tags.
   */
  async findAll(): Promise<CourseTag[]> {
    return this.courseTagRepository.find({
      order: { name: 'ASC' }
    });
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