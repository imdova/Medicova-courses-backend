import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseCategory } from './entities/course-category.entity';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto';

@Injectable()
export class CourseCategoryService {
  constructor(
    @InjectRepository(CourseCategory)
    private readonly courseCategoryRepository: Repository<CourseCategory>,
  ) {}

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

    return this.courseCategoryRepository.save(category);
  }

  async findAll(): Promise<CourseCategory[]> {
    return this.courseCategoryRepository.find({
      where: { deleted_at: null },
      relations: ['parent', 'subcategories'],
      order: { name: 'ASC' },
    });
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
    return this.courseCategoryRepository.save(category);
  }

  async remove(id: string) {
    const category = await this.findOne(id);

    return await this.courseCategoryRepository.remove(category);
  }
}
