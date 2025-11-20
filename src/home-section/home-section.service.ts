import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { HomeSection, HomeSectionType, ContentType } from './entities/home-section.entity';
import { CreateHomeSectionDto } from './dto/create-home-section.dto';
import { UpdateHomeSectionDto } from './dto/update-home-section.dto';
import { UpdateSectionOrderDto } from './dto/update-section-order.dto';
import { BulkUpdateSectionsDto } from './dto/bulk-update-sections.dto';
import { Course, CourseStatus } from '../course/entities/course.entity';
import { CourseCategory } from '../course/course-category/entities/course-category.entity';

// Section configuration with limits
const SECTION_CONFIG = {
  [HomeSectionType.FEATURED_COURSES]: { limit: 4, contentTypes: [ContentType.COURSE] },
  [HomeSectionType.TRENDING]: {
    limit: 5, // 2 promo cards + 3 courses
    contentTypes: [ContentType.PROMO_CARD, ContentType.COURSE]
  },
  [HomeSectionType.CATEGORY_SHOWCASE]: { limit: 10, contentTypes: [ContentType.CATEGORY] },
  [HomeSectionType.BESTSELLER]: { limit: 3, contentTypes: [ContentType.COURSE] },
  [HomeSectionType.TOP_RATED]: { limit: 3, contentTypes: [ContentType.COURSE] },
};

@Injectable()
export class HomeSectionService {
  constructor(
    @InjectRepository(HomeSection)
    private readonly homeSectionRepository: Repository<HomeSection>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseCategory)
    private readonly categoryRepository: Repository<CourseCategory>,
  ) { }

  private validateSectionLimits(sectionType: HomeSectionType, position: number) {
    const config = SECTION_CONFIG[sectionType];
    if (!config) {
      throw new BadRequestException(`Invalid section type: ${sectionType}`);
    }

    if (position < 1 || position > config.limit) {
      throw new BadRequestException(
        `Position ${position} is invalid for section ${sectionType}. Must be between 1 and ${config.limit}`
      );
    }
  }

  private async validateReferenceId(contentType: ContentType, referenceId: string): Promise<void> {
    let exists = false;

    switch (contentType) {
      case ContentType.COURSE:
        exists = await this.courseRepository.exists({
          where: {
            id: referenceId,
            status: CourseStatus.PUBLISHED,
          }
        });
        break;
      case ContentType.CATEGORY:
        exists = await this.categoryRepository.exists({
          where: { id: referenceId }
        });
        break;
      case ContentType.PROMO_CARD:
        // For promo cards, we don't validate against external entities
        exists = true;
        break;
    }

    if (!exists) {
      throw new NotFoundException(`${contentType} with ID ${referenceId} not found or not available`);
    }
  }

  async create(createHomeSectionDto: CreateHomeSectionDto): Promise<HomeSection> {
    const { sectionType, contentType, referenceId, position = 1 } = createHomeSectionDto;

    // Validate section limits
    this.validateSectionLimits(sectionType, position);

    // Validate reference ID exists
    await this.validateReferenceId(contentType, referenceId);

    // Check if position is already taken in this section
    const existingPosition = await this.homeSectionRepository.findOne({
      where: { sectionType, position, isActive: true }
    });

    if (existingPosition) {
      throw new ConflictException(`Position ${position} is already occupied in ${sectionType} section`);
    }

    // Check if reference is already used in this section
    const existingReference = await this.homeSectionRepository.findOne({
      where: { sectionType, referenceId, isActive: true }
    });

    if (existingReference) {
      throw new ConflictException(`This ${contentType} is already featured in ${sectionType} section`);
    }

    const homeSection = this.homeSectionRepository.create(createHomeSectionDto);
    return await this.homeSectionRepository.save(homeSection);
  }

  async findBySectionType(sectionType: HomeSectionType, includeInactive = false): Promise<HomeSection[]> {
    const where: any = { sectionType };
    if (!includeInactive) {
      where.isActive = true;
    }

    return await this.homeSectionRepository.find({
      where,
      order: { position: 'ASC', order: 'ASC' }
    });
  }

  async findAllSections(): Promise<Record<HomeSectionType, HomeSection[]>> {
    const sections = await this.homeSectionRepository.find({
      where: { isActive: true },
      order: { sectionType: 'ASC', position: 'ASC', order: 'ASC' }
    });

    const result: Record<HomeSectionType, HomeSection[]> = {
      [HomeSectionType.FEATURED_COURSES]: [],
      [HomeSectionType.TRENDING]: [],
      [HomeSectionType.CATEGORY_SHOWCASE]: [],
      [HomeSectionType.BESTSELLER]: [],
      [HomeSectionType.TOP_RATED]: [],
    };

    sections.forEach(section => {
      result[section.sectionType].push(section);
    });

    return result;
  }

  async findOne(id: string): Promise<HomeSection> {
    const homeSection = await this.homeSectionRepository.findOne({
      where: { id }
    });

    if (!homeSection) {
      throw new NotFoundException('Home section item not found');
    }

    return homeSection;
  }

  async update(id: string, updateHomeSectionDto: UpdateHomeSectionDto): Promise<HomeSection> {
    const homeSection = await this.findOne(id);

    if (updateHomeSectionDto.sectionType) {
      throw new BadRequestException('Cannot change section type of existing item');
    }

    if (updateHomeSectionDto.position !== undefined) {
      this.validateSectionLimits(homeSection.sectionType, updateHomeSectionDto.position);

      // Check if new position is already taken (excluding current record)
      const existing = await this.homeSectionRepository.findOne({
        where: {
          sectionType: homeSection.sectionType,
          position: updateHomeSectionDto.position,
          isActive: true,
          id: Not(id)
        }
      });

      if (existing) {
        throw new ConflictException(`Position ${updateHomeSectionDto.position} is already occupied`);
      }
    }

    if (updateHomeSectionDto.referenceId && updateHomeSectionDto.contentType) {
      await this.validateReferenceId(updateHomeSectionDto.contentType, updateHomeSectionDto.referenceId);

      // Check if new reference is already used in this section
      const existingReference = await this.homeSectionRepository.findOne({
        where: {
          sectionType: homeSection.sectionType,
          referenceId: updateHomeSectionDto.referenceId,
          isActive: true,
          id: Not(id)
        }
      });

      if (existingReference) {
        throw new ConflictException(`This ${updateHomeSectionDto.contentType} is already featured in ${homeSection.sectionType} section`);
      }
    }

    Object.assign(homeSection, updateHomeSectionDto);
    return await this.homeSectionRepository.save(homeSection);
  }

  async remove(id: string): Promise<void> {
    const homeSection = await this.findOne(id);
    await this.homeSectionRepository.remove(homeSection);
  }

  async updateSectionOrder(updateOrderDto: UpdateSectionOrderDto): Promise<HomeSection[]> {
    const { sectionType, items } = updateOrderDto;

    // Validate positions
    const positions = items.map(item => item.position);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      throw new BadRequestException('Duplicate positions are not allowed');
    }

    const config = SECTION_CONFIG[sectionType];
    const invalidPositions = positions.filter(p => p < 1 || p > config.limit);
    if (invalidPositions.length > 0) {
      throw new BadRequestException(`Positions must be between 1 and ${config.limit} for ${sectionType}`);
    }

    // Get all items to update
    const itemIds = items.map(item => item.id);
    const existingItems = await this.homeSectionRepository.find({
      where: { id: In(itemIds), sectionType }
    });

    if (existingItems.length !== itemIds.length) {
      throw new NotFoundException('Some home section items not found');
    }

    // Update each item
    const updatePromises = items.map(async (item) => {
      const homeSection = existingItems.find(ei => ei.id === item.id);
      if (homeSection) {
        homeSection.position = item.position;
        homeSection.order = item.order;
        return await this.homeSectionRepository.save(homeSection);
      }
    });

    const updated = await Promise.all(updatePromises);
    return updated.filter(Boolean) as HomeSection[];
  }

  async bulkUpdateSections(bulkUpdateDto: BulkUpdateSectionsDto): Promise<HomeSection[]> {
    const { sectionType, items } = bulkUpdateDto;
    const config = SECTION_CONFIG[sectionType];

    // Validate limits
    if (items.length > config.limit) {
      throw new BadRequestException(
        `Cannot add more than ${config.limit} items to ${sectionType} section`
      );
    }

    // Validate positions
    const positions = items.map(item => item.position);
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      throw new BadRequestException('Duplicate positions are not allowed');
    }

    const invalidPositions = positions.filter(p => p < 1 || p > config.limit);
    if (invalidPositions.length > 0) {
      throw new BadRequestException(`Positions must be between 1 and ${config.limit} for ${sectionType}`);
    }

    // Validate all reference IDs
    for (const item of items) {
      if (!config.contentTypes.includes(item.contentType)) {
        throw new BadRequestException(
          `Content type ${item.contentType} is not allowed in ${sectionType} section`
        );
      }
      await this.validateReferenceId(item.contentType, item.referenceId);
    }

    // Remove existing items for this section
    await this.homeSectionRepository.delete({ sectionType });

    // Create new items
    const newItems = items.map(item =>
      this.homeSectionRepository.create({
        ...item,
        sectionType,
        isActive: true
      })
    );

    return await this.homeSectionRepository.save(newItems);
  }

  async getAvailableContent(
    sectionType: HomeSectionType,
    contentType: ContentType,
    search?: string
  ): Promise<any[]> {
    const config = SECTION_CONFIG[sectionType];
    if (!config.contentTypes.includes(contentType)) {
      throw new BadRequestException(
        `Content type ${contentType} is not allowed in ${sectionType} section`
      );
    }

    switch (contentType) {
      case ContentType.COURSE:
        return await this.getAvailableCourses(search);
      case ContentType.CATEGORY:
        return await this.getAvailableCategories(search);
      case ContentType.PROMO_CARD:
        // For promo cards, return empty or predefined templates
        return [];
      default:
        return [];
    }
  }

  private async getAvailableCourses(search?: string): Promise<Course[]> {
    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('instructor.profile', 'profile')
      .leftJoinAndSelect('course.pricings', 'pricing')
      .where('course.status = :status', { status: 'published' })
      .andWhere('course.approval_status = :approvalStatus', { approvalStatus: 'approved' })
      .andWhere('course.isActive = true')
      .andWhere('course.deleted_at IS NULL');

    if (search) {
      qb.andWhere('course.name ILIKE :search', { search: `%${search}%` });
    }

    return await qb
      .orderBy('course.name', 'ASC')
      .getMany();
  }

  private async getAvailableCategories(search?: string): Promise<CourseCategory[]> {
    const qb = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.parentId IS NULL') // Only main categories
      .andWhere('category.isActive = true');

    if (search) {
      qb.andWhere('category.name ILIKE :search', { search: `%${search}%` });
    }

    return await qb
      .orderBy('category.name', 'ASC')
      .getMany();
  }
}