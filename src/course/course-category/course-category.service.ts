import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseCategory } from './entities/course-category.entity';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto';
import { Course } from '../entities/course.entity';

@Injectable()
export class CourseCategoryService {
  constructor(
    @InjectRepository(CourseCategory)
    private readonly courseCategoryRepository: Repository<CourseCategory>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) { }

  // --- CourseCategoryService ---
  async create(
    dto: CreateCourseCategoryDto,
    userId: string,
  ): Promise<CourseCategory> {
    let parent: CourseCategory = null;

    if (dto.parentId) {
      parent = await this.courseCategoryRepository.findOne({
        where: { id: dto.parentId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    // 🆕 ALWAYS calculate the next priority - ignore dto.priority
    const priority = await this.getNextPriority(dto.parentId ?? null);

    const category = this.courseCategoryRepository.create({
      ...dto,
      priority, // Always use auto-assigned priority
      createdBy: userId,
      parent,
    });

    try {
      return await this.courseCategoryRepository.save(category);
    } catch (err: any) {
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';

        if (detail.includes('(name)')) {
          throw new BadRequestException(
            `A category with the name "${dto.name}" already exists.`,
          );
        }
        if (detail.includes('(slug)')) {
          throw new BadRequestException(
            `A category with the slug "${dto.slug}" already exists.`,
          );
        }
        throw new BadRequestException('A duplicate entry was detected. Please check your unique fields.');
      }
      throw err;
    }
  }

  async findAll(): Promise<any[]> {
    const categories = await this.courseCategoryRepository.find({
      where: { deleted_at: null },
      relations: ['parent', 'subcategories'],
      order: { priority: 'ASC' },
    });

    // Get all category IDs (both parent and subcategory)
    const allCategoryIds = categories.flatMap(cat => [
      cat.id,
      ...(cat.subcategories?.map(sub => sub.id) || [])
    ]);

    // Get all published courses for these categories
    const courses = await this.courseRepository.find({
      where: {
        deleted_at: null,
      },
      relations: ['category', 'subCategory'],
      select: ['id', 'name', 'slug', 'category', 'subCategory']
    });

    // Filter courses that belong to our categories
    const relevantCourses = courses.filter(course =>
      (course.category && allCategoryIds.includes(course.category.id)) ||
      (course.subCategory && allCategoryIds.includes(course.subCategory.id))
    );

    // Create maps for counts and course lists
    const countMap = new Map();
    const coursesMap = new Map();

    // Initialize all category IDs with empty arrays and zero counts
    allCategoryIds.forEach(id => {
      coursesMap.set(id, []);
      countMap.set(id, 0);
    });

    // Process each course and add to appropriate categories
    relevantCourses.forEach(course => {
      // Add to main category if it exists
      if (course.category && allCategoryIds.includes(course.category.id)) {
        const currentCount = countMap.get(course.category.id) || 0;
        countMap.set(course.category.id, currentCount + 1);

        const categoryCourses = coursesMap.get(course.category.id);
        if (!categoryCourses.some(c => c.id === course.id)) {
          categoryCourses.push({
            id: course.id,
            name: course.name,
            slug: course.slug
          });
        }
      }

      // Add to subcategory if it exists
      if (course.subCategory && allCategoryIds.includes(course.subCategory.id)) {
        const currentCount = countMap.get(course.subCategory.id) || 0;
        countMap.set(course.subCategory.id, currentCount + 1);

        const subcategoryCourses = coursesMap.get(course.subCategory.id);
        if (!subcategoryCourses.some(c => c.id === course.id)) {
          subcategoryCourses.push({
            id: course.id,
            name: course.name,
            slug: course.slug
          });
        }
      }
    });

    // Add counts and courses to categories and subcategories
    return categories.map(category => ({
      ...category,
      courseCount: countMap.get(category.id) || 0,
      courses: coursesMap.get(category.id) || [],
      subcategories: (category.subcategories || []).map(subcategory => ({
        ...subcategory,
        courseCount: countMap.get(subcategory.id) || 0,
        courses: coursesMap.get(subcategory.id) || []
      }))
    }));
  }

  async findOne(id: string): Promise<CourseCategory> {
    const category = await this.courseCategoryRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['parent', 'subcategories'],
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(
    id: string,
    dto: UpdateCourseCategoryDto,
  ): Promise<CourseCategory> {
    const category = await this.findOne(id);

    // 🆕 Handle priority change
    if (dto.priority !== undefined && dto.priority !== category.priority) {
      await this.handlePriorityUpdate(category, dto.priority);
    }

    if (dto.parentId) {
      const parent = await this.courseCategoryRepository.findOne({
        where: { id: dto.parentId },
      });
      if (!parent) throw new NotFoundException('Parent category not found');
      category.parent = parent;
    } else {
      category.parent = null;
    }

    Object.assign(category, dto);

    try {
      return await this.courseCategoryRepository.save(category);
    } catch (err: any) {
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';

        if (detail.includes('(name)')) {
          throw new BadRequestException(
            `A category with the name "${dto.name}" already exists.`,
          );
        }
        if (detail.includes('(slug)')) {
          throw new BadRequestException(
            `A category with the slug "${dto.slug}" already exists.`,
          );
        }
        throw new BadRequestException('A duplicate entry was detected. Please check your unique fields.');
      }
      throw err;
    }
  }

  private async handlePriorityUpdate(category: CourseCategory, newPriority: number): Promise<void> {
    const parentId = category.parent?.id || null;

    // If moving to a higher priority (lower number), shift categories down
    if (newPriority < category.priority) {
      const queryBuilder = this.courseCategoryRepository
        .createQueryBuilder()
        .update(CourseCategory)
        .set({
          priority: () => 'priority + 1'
        });

      if (parentId === null) {
        queryBuilder.where('parent_id IS NULL');
      } else {
        queryBuilder.where('parent_id = :parentId', { parentId });
      }

      await queryBuilder
        .andWhere('priority >= :newPriority', { newPriority })
        .andWhere('priority < :oldPriority', { oldPriority: category.priority })
        .andWhere('id != :categoryId', { categoryId: category.id })
        .andWhere('deleted_at IS NULL')
        .execute();
    }
    // If moving to a lower priority (higher number), shift categories up
    else if (newPriority > category.priority) {
      const queryBuilder = this.courseCategoryRepository
        .createQueryBuilder()
        .update(CourseCategory)
        .set({
          priority: () => 'priority - 1'
        });

      if (parentId === null) {
        queryBuilder.where('parent_id IS NULL');
      } else {
        queryBuilder.where('parent_id = :parentId', { parentId });
      }

      await queryBuilder
        .andWhere('priority <= :newPriority', { newPriority })
        .andWhere('priority > :oldPriority', { oldPriority: category.priority })
        .andWhere('id != :categoryId', { categoryId: category.id })
        .andWhere('deleted_at IS NULL')
        .execute();
    }
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    return await this.courseCategoryRepository.remove(category);
  }

  private async getNextPriority(parentId: string | null): Promise<number> {
    const queryBuilder = this.courseCategoryRepository
      .createQueryBuilder('category')
      .select('MAX(category.priority)', 'maxPriority')
      .where('category.deleted_at IS NULL');

    // Use column name instead of relation for proper querying
    if (parentId === null) {
      queryBuilder.andWhere('category.parent_id IS NULL');
    } else {
      queryBuilder.andWhere('category.parent_id = :parentId', { parentId });
    }

    const result = await queryBuilder.getRawOne();
    console.log('Max priority result for parentId', parentId, ':', result);

    // If no categories exist (maxPriority is null), start at 1
    // Otherwise, increment the max priority by 1
    return (result?.maxPriority ?? 0) + 1;
  }

  private async validateAndShiftPriorities(parentId: string | null, newPriority: number): Promise<void> {
    // Check if priority already exists for this parent
    const existing = await this.courseCategoryRepository.findOne({
      where: {
        parent: { id: parentId },
        priority: newPriority,
        deleted_at: null
      }
    });

    if (existing) {
      // Shift all categories with priority >= newPriority by +1
      await this.courseCategoryRepository
        .createQueryBuilder()
        .update(CourseCategory)
        .set({
          priority: () => 'priority + 1'
        })
        .where('parent_id = :parentId', { parentId })
        .andWhere('priority >= :newPriority', { newPriority })
        .andWhere('deleted_at IS NULL')
        .execute();
    }
  }
}
