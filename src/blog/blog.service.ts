import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Blog } from './entities/blog.entity';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(Blog)
    private readonly blogRepository: Repository<Blog>,
  ) { }

  async create(createBlogDto: CreateBlogDto): Promise<Blog> {
    // Check if slug already exists
    const existingBlog = await this.blogRepository.findOne({
      where: { slug: createBlogDto.slug },
    });

    if (existingBlog) {
      throw new ConflictException('Blog with this slug already exists');
    }

    try {
      const blog = this.blogRepository.create(createBlogDto);
      return await this.blogRepository.save(blog);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictException('Blog with this slug already exists');
      }
      throw new BadRequestException('Failed to create blog');
    }
  }

  async findAll(filters?: {
    isActive?: boolean;
    isDraft?: boolean;
    isTemplate?: boolean;
  }): Promise<Blog[]> {
    const where: any = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.isDraft !== undefined) {
      where.isDraft = filters.isDraft;
    }
    if (filters?.isTemplate !== undefined) {
      where.isTemplate = filters.isTemplate;
    }

    return this.blogRepository.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Blog> {
    const blog = await this.blogRepository.findOne({
      where: { id },
    });

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${id} not found`);
    }

    return blog;
  }

  async findBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogRepository.findOne({
      where: { slug, isActive: true, isDraft: false },
    });

    if (!blog) {
      throw new NotFoundException(`Blog with slug ${slug} not found`);
    }

    return blog;
  }

  async update(id: string, updateBlogDto: UpdateBlogDto): Promise<Blog> {
    const blog = await this.findOne(id);

    // Check if slug is being updated and if it already exists
    if (updateBlogDto.slug && updateBlogDto.slug !== blog.slug) {
      const existingBlog = await this.blogRepository.findOne({
        where: { slug: updateBlogDto.slug },
      });

      if (existingBlog) {
        throw new ConflictException('Blog with this slug already exists');
      }
    }

    try {
      await this.blogRepository.update(id, updateBlogDto);
      return await this.findOne(id);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictException('Blog with this slug already exists');
      }
      throw new BadRequestException('Failed to update blog');
    }
  }

  async remove(id: string): Promise<void> {
    const blog = await this.findOne(id);
    await this.blogRepository.remove(blog);
  }

  async incrementViews(id: string): Promise<Blog> {
    const blog = await this.findOne(id);

    blog.views = (blog.views || 0) + 1;

    return await this.blogRepository.save(blog);
  }

  // Additional utility methods
  async getActiveBlogs(): Promise<Blog[]> {
    return this.blogRepository.find({
      where: {
        isActive: true,
        isDraft: false
      },
      order: { created_at: 'DESC' },
    });
  }

  async getDraftBlogs(): Promise<Blog[]> {
    return this.blogRepository.find({
      where: { isDraft: true },
      order: { created_at: 'DESC' },
    });
  }

  async getTemplateBlogs(): Promise<Blog[]> {
    return this.blogRepository.find({
      where: { isTemplate: true },
      order: { created_at: 'DESC' },
    });
  }
}