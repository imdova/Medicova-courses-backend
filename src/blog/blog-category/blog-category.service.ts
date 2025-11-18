import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BlogCategory } from './entities/blog-category.entity';
import { Blog } from '../entities/blog.entity';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from './dto/update-blog-category.dto';

@Injectable()
export class BlogCategoryService {
  constructor(
    @InjectRepository(BlogCategory)
    private readonly blogCategoryRepository: Repository<BlogCategory>,
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
  ) { }

  async create(createBlogCategoryDto: CreateBlogCategoryDto): Promise<BlogCategory> {
    // Check if name or slug already exists
    await this.checkUniqueConstraints(createBlogCategoryDto.name, createBlogCategoryDto.slug);

    // Validate parent category if provided
    if (createBlogCategoryDto.parentId) {
      const parentCategory = await this.blogCategoryRepository.findOne({
        where: { id: createBlogCategoryDto.parentId }
      });
      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }
    }

    try {
      const category = this.blogCategoryRepository.create(createBlogCategoryDto);
      return await this.blogCategoryRepository.save(category);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictException('Category with this name or slug already exists');
      }
      throw new BadRequestException('Failed to create blog category');
    }
  }

  async findAll(filters?: {
  }): Promise<any[]> {
    const where: any = { deleted_at: null };

    // Get categories with their subcategories
    const categories = await this.blogCategoryRepository.find({
      where,
      relations: ['subcategories'],
      order: { name: 'ASC' },
    });

    // Get all category IDs (both parent and subcategory)
    const allCategoryIds = categories.flatMap(cat => [
      cat.id,
      ...(cat.subcategories?.map(sub => sub.id) || [])
    ]);

    if (allCategoryIds.length === 0) {
      return categories.map(category => ({
        ...category,
        blogCount: 0,
        subcategories: (category.subcategories || []).map(subcategory => ({
          ...subcategory,
          blogCount: 0
        }))
      }));
    }

    // Get blog counts in a single query
    const blogCounts = await this.blogRepository
      .createQueryBuilder('blog')
      .select('blog.category_id', 'categoryId')
      .addSelect('blog.sub_category_id', 'subcategoryId')
      .addSelect('COUNT(*)', 'count')
      .where('blog.deleted_at IS NULL')
      .andWhere('blog.isActive = :isActive', { isActive: true })
      .andWhere('blog.isDraft = :isDraft', { isDraft: false })
      .andWhere('(blog.category_id IN (:...ids) OR blog.sub_category_id IN (:...ids))', { ids: allCategoryIds })
      .groupBy('blog.category_id, blog.sub_category_id')
      .getRawMany();

    // Create a map for quick lookup
    const countMap = new Map();

    blogCounts.forEach(item => {
      if (item.categoryId) {
        countMap.set(item.categoryId, parseInt(item.count));
      }
      if (item.subcategoryId) {
        countMap.set(item.subcategoryId, parseInt(item.count));
      }
    });

    // Add counts to categories and subcategories
    return categories.map(category => ({
      ...category,
      blogCount: countMap.get(category.id) || 0,
      subcategories: (category.subcategories || []).map(subcategory => ({
        ...subcategory,
        blogCount: countMap.get(subcategory.id) || 0
      }))
    }));
  }

  async findOne(id: string): Promise<BlogCategory> {
    const category = await this.blogCategoryRepository.findOne({
      where: { id },
      relations: ['blogs'],
    });

    if (!category) {
      throw new NotFoundException(`Blog category with ID ${id} not found`);
    }

    return category;
  }

  async findBySlug(slug: string): Promise<BlogCategory> {
    const category = await this.blogCategoryRepository.findOne({
      where: { slug, isActive: true },
      relations: ['blogs'],
    });

    if (!category) {
      throw new NotFoundException(`Blog category with slug ${slug} not found`);
    }

    return category;
  }

  async update(id: string, updateBlogCategoryDto: UpdateBlogCategoryDto): Promise<BlogCategory> {
    const category = await this.findOne(id);

    // Check if name or slug is being updated and if they already exist
    if (updateBlogCategoryDto.name && updateBlogCategoryDto.name !== category.name) {
      await this.checkUniqueConstraints(updateBlogCategoryDto.name, undefined, id);
    }
    if (updateBlogCategoryDto.slug && updateBlogCategoryDto.slug !== category.slug) {
      await this.checkUniqueConstraints(undefined, updateBlogCategoryDto.slug, id);
    }

    // Validate parent category if provided
    if (updateBlogCategoryDto.parentId !== undefined) {
      if (updateBlogCategoryDto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      if (updateBlogCategoryDto.parentId) {
        const parentCategory = await this.blogCategoryRepository.findOne({
          where: { id: updateBlogCategoryDto.parentId }
        });
        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }
      }
    }

    try {
      await this.blogCategoryRepository.update(id, updateBlogCategoryDto);
      return await this.findOne(id);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictException('Category with this name or slug already exists');
      }
      throw new BadRequestException('Failed to update blog category');
    }
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Check if category has any blogs
    const blogCount = await this.blogRepository.count({
      where: [
        { categoryId: id },
        { subCategoryId: id }
      ]
    });

    if (blogCount > 0) {
      throw new BadRequestException('Cannot delete category that has associated blogs');
    }

    // Check if category has any subcategories
    const subcategoryCount = await this.blogCategoryRepository.count({
      where: { parentId: id }
    });

    if (subcategoryCount > 0) {
      throw new BadRequestException('Cannot delete category that has subcategories');
    }

    await this.blogCategoryRepository.remove(category);
  }

  async getCategoryBlogs(categoryId: string, includeSubcategories: boolean = false): Promise<Blog[]> {
    const category = await this.findOne(categoryId);

    let whereConditions: any[] = [
      { categoryId, isActive: true, isDraft: false }
    ];

    if (includeSubcategories) {
      // Get all subcategory IDs
      const subcategories = await this.blogCategoryRepository.find({
        where: { parentId: categoryId, isActive: true },
        select: ['id']
      });
      const subcategoryIds = subcategories.map(sc => sc.id);

      if (subcategoryIds.length > 0) {
        whereConditions.push({
          subCategoryId: In(subcategoryIds),
          isActive: true,
          isDraft: false
        });
      }
    }

    return this.blogRepository.find({
      where: whereConditions,
      relations: ['category', 'subCategory'],
      order: { created_at: 'DESC' },
    });
  }

  async getSubcategories(parentId: string): Promise<BlogCategory[]> {
    const parentCategory = await this.findOne(parentId);

    return this.blogCategoryRepository.find({
      where: {
        parentId: parentCategory.id,
        isActive: true
      },
      order: { name: 'ASC' },
    });
  }

  async getCategoryHierarchy(): Promise<any[]> {
    const categories = await this.blogCategoryRepository.find({
      where: { isActive: true },
      relations: ['blogs'],
      order: { name: 'ASC' },
    });

    // Build hierarchical structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map and count blogs
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        blogCount: category.blogs ? category.blogs.length : 0,
        subcategories: []
      });
    });

    // Second pass: build hierarchy
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id);
      if (category.parentId && categoryMap.has(category.parentId)) {
        const parent = categoryMap.get(category.parentId);
        parent.subcategories.push(categoryNode);
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return rootCategories;
  }

  private async checkUniqueConstraints(name?: string, slug?: string, excludeId?: string): Promise<void> {
    const where: any = {};

    if (name) {
      where.name = name;
    }
    if (slug) {
      where.slug = slug;
    }

    const existingCategory = await this.blogCategoryRepository.findOne({
      where,
    });

    if (existingCategory && existingCategory.id !== excludeId) {
      if (name && existingCategory.name === name) {
        throw new ConflictException('Category with this name already exists');
      }
      if (slug && existingCategory.slug === slug) {
        throw new ConflictException('Category with this slug already exists');
      }
    }
  }

  // Utility methods
  async getActiveCategories(): Promise<BlogCategory[]> {
    return this.blogCategoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getCategoriesWithBlogCount(): Promise<any[]> {
    const categories = await this.blogCategoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.blogs', 'blog', 'blog.isActive = :isActive AND blog.isDraft = :isDraft', {
        isActive: true,
        isDraft: false
      })
      .select([
        'category.id',
        'category.name',
        'category.slug',
        'category.image',
        'category.parentId',
        'COUNT(blog.id) as blogCount'
      ])
      .where('category.isActive = :isActive', { isActive: true })
      .groupBy('category.id')
      .orderBy('category.name', 'ASC')
      .getRawMany();

    return categories;
  }
}