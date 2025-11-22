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

    const category = this.courseCategoryRepository.create({
      ...dto,
      createdBy: userId,
      parent,
    });

    try {
      // 💡 Attempt to save the new category
      return await this.courseCategoryRepository.save(category);
    } catch (err: any) {
      // ⚠️ Handle PostgreSQL unique constraint error (code '23505')
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
        // Fallback for other unique constraint errors
        throw new BadRequestException('A duplicate entry was detected. Please check your unique fields.');
      }

      // Re-throw if it's not the unique constraint error
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

    // Get course counts for main categories
    const mainCategoryCounts = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.category_id', 'categoryId')
      .addSelect('COUNT(course.id)', 'count')
      .where('course.deleted_at IS NULL')
      .andWhere('course.category_id IN (:...ids)', { ids: allCategoryIds })
      .groupBy('course.category_id')
      .getRawMany();

    // Get course counts for subcategories
    const subCategoryCounts = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.subcategory_id', 'categoryId')
      .addSelect('COUNT(course.id)', 'count')
      .where('course.deleted_at IS NULL')
      .andWhere('course.subcategory_id IN (:...ids)', { ids: allCategoryIds })
      .groupBy('course.subcategory_id')
      .getRawMany();

    // Combine both counts (accumulate like in processCategoriesWithCounts)
    const countMap = new Map();

    // Add main category counts
    mainCategoryCounts.forEach(item => {
      if (item.categoryId) {
        countMap.set(item.categoryId, parseInt(item.count, 10) || 0);
      }
    });

    // Add subcategory counts (accumulate if category appears in both)
    subCategoryCounts.forEach(item => {
      if (item.categoryId) {
        const currentCount = countMap.get(item.categoryId) || 0;
        countMap.set(item.categoryId, currentCount + (parseInt(item.count, 10) || 0));
      }
    });

    // Add counts to categories and subcategories
    return categories.map(category => ({
      ...category,
      courseCount: countMap.get(category.id) || 0,
      subcategories: (category.subcategories || []).map(subcategory => ({
        ...subcategory,
        courseCount: countMap.get(subcategory.id) || 0
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
      // 💡 Attempt to save the updated category
      return await this.courseCategoryRepository.save(category);
    } catch (err: any) {
      // ⚠️ Handle PostgreSQL unique constraint error (code '23505')
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';

        // Check if the duplicate error is for name or slug
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
        // Fallback for other unique constraint errors
        throw new BadRequestException('A duplicate entry was detected. Please check your unique fields.');
      }

      // Re-throw if it's not the unique constraint error
      throw err;
    }
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    return await this.courseCategoryRepository.remove(category);
  }
}
