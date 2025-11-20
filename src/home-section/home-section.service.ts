import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  HomeSection,
  HomeSectionType,
  HomeSectionConfig,
  FeaturedCoursesConfig,
  TrendingConfig,
  CategoryShowcaseConfig,
  CourseListConfig
} from './entities/home-section.entity';
import { CreateHomeSectionDto } from './dto/create-home-section.dto';
import { UpdateHomeSectionDto } from './dto/update-home-section.dto';
import { Course } from '../course/entities/course.entity';
import { CourseCategory } from '../course/course-category/entities/course-category.entity';

// Type guards
const isFeaturedCoursesConfig = (config: any): config is FeaturedCoursesConfig => {
  return config && Array.isArray(config.courses);
};

const isTrendingConfig = (config: any): config is TrendingConfig => {
  return config &&
    Array.isArray(config.promoCards) &&
    Array.isArray(config.categoryCourses);
};

const isCategoryShowcaseConfig = (config: any): config is CategoryShowcaseConfig => {
  return config && Array.isArray(config.categories);
};

const isCourseListConfig = (config: any): config is CourseListConfig => {
  return config && Array.isArray(config.courses);
};

// Validation rules for each section type
const SECTION_RULES = {
  [HomeSectionType.FEATURED_COURSES]: {
    maxCourses: 4,
    validate: (config: any) => {
      if (!isFeaturedCoursesConfig(config)) {
        throw new BadRequestException('Invalid featured courses configuration');
      }
      if (config.courses.length > 4) {
        throw new BadRequestException('Featured courses cannot exceed 4 courses');
      }

      const courseIds = config.courses.map((c: any) => c.courseId);
      const uniqueIds = new Set(courseIds);
      if (uniqueIds.size !== courseIds.length) {
        throw new BadRequestException('Duplicate course IDs are not allowed');
      }
    }
  },
  [HomeSectionType.TRENDING]: {
    validate: (config: any) => {
      if (!isTrendingConfig(config)) {
        throw new BadRequestException('Invalid trending configuration');
      }

      // Validate promo cards
      if (config.promoCards.length > 2) {
        throw new BadRequestException('Trending section cannot have more than 2 promo cards');
      }

      // Validate categories
      if (config.categoryCourses.length > 4) {
        throw new BadRequestException('Trending section cannot have more than 4 categories');
      }

      // Validate each category has exactly 3 courses
      config.categoryCourses.forEach((category: any, index: number) => {
        if (!category.courses || !Array.isArray(category.courses)) {
          throw new BadRequestException(`Category at position ${index} must have a courses array`);
        }
        if (category.courses.length !== 3) {
          throw new BadRequestException(`Each category must have exactly 3 courses. Category ${index} has ${category.courses.length}`);
        }

        // Validate no duplicate course IDs within category
        const courseIds = category.courses.map((c: any) => c.courseId);
        const uniqueCourseIds = new Set(courseIds);
        if (uniqueCourseIds.size !== courseIds.length) {
          throw new BadRequestException(`Duplicate course IDs found in category ${index}`);
        }
      });

      // Validate no duplicate category IDs
      const categoryIds = config.categoryCourses.map((c: any) => c.categoryId);
      const uniqueCategoryIds = new Set(categoryIds);
      if (uniqueCategoryIds.size !== categoryIds.length) {
        throw new BadRequestException('Duplicate category IDs are not allowed');
      }
    }
  },
  [HomeSectionType.CATEGORY_SHOWCASE]: {
    maxCategories: 10,
    validate: (config: any) => {
      if (!isCategoryShowcaseConfig(config)) {
        throw new BadRequestException('Invalid category showcase configuration');
      }
      if (config.categories.length > 10) {
        throw new BadRequestException('Category showcase cannot exceed 10 categories');
      }
    }
  },
  [HomeSectionType.BESTSELLER]: {
    maxCourses: 3,
    validate: (config: any) => {
      if (!isCourseListConfig(config)) {
        throw new BadRequestException('Invalid bestseller configuration');
      }
      if (config.courses.length > 3) {
        throw new BadRequestException('Bestseller section cannot exceed 3 courses');
      }
    }
  },
  [HomeSectionType.TOP_RATED]: {
    maxCourses: 3,
    validate: (config: any) => {
      if (!isCourseListConfig(config)) {
        throw new BadRequestException('Invalid top rated configuration');
      }
      if (config.courses.length > 3) {
        throw new BadRequestException('Top rated section cannot exceed 3 courses');
      }
    }
  }
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

  private async validateConfig(sectionType: HomeSectionType, config: any): Promise<void> {
    const rules = SECTION_RULES[sectionType];
    if (!rules) {
      throw new BadRequestException(`Invalid section type: ${sectionType}`);
    }

    // Validate structure
    rules.validate(config);

    // Validate referenced entities exist
    await this.validateReferences(sectionType, config);
  }

  private async validateReferences(sectionType: HomeSectionType, config: any): Promise<void> {
    const courseIds = new Set<string>();
    const categoryIds = new Set<string>();

    // Extract all referenced IDs based on section type
    switch (sectionType) {
      case HomeSectionType.FEATURED_COURSES:
        if (isFeaturedCoursesConfig(config)) {
          config.courses.forEach(c => courseIds.add(c.courseId));
        }
        break;
      case HomeSectionType.TRENDING:
        if (isTrendingConfig(config)) {
          // Extract course IDs
          config.categoryCourses.forEach(category => {
            category.courses.forEach(course => {
              courseIds.add(course.courseId);
            });
          });

          // Extract category IDs
          config.categoryCourses.forEach(category => {
            categoryIds.add(category.categoryId);
          });
        }
        break;
      case HomeSectionType.CATEGORY_SHOWCASE:
        if (isCategoryShowcaseConfig(config)) {
          config.categories.forEach(c => categoryIds.add(c.categoryId));
        }
        break;
      case HomeSectionType.BESTSELLER:
      case HomeSectionType.TOP_RATED:
        if (isCourseListConfig(config)) {
          config.courses.forEach(c => courseIds.add(c.courseId));
        }
        break;
    }

    // Validate courses exist and are published/approved
    if (courseIds.size > 0) {
      const existingCourses = await this.courseRepository
        .createQueryBuilder('course')
        .where('course.id IN (:...ids)', { ids: Array.from(courseIds) })
        .andWhere('course.status = :status', { status: 'published' })
        .andWhere('course.isActive = true')
        .getMany();

      if (existingCourses.length !== courseIds.size) {
        throw new BadRequestException('Some courses not found or not available');
      }
    }

    // Validate categories exist
    if (categoryIds.size > 0) {
      const existingCategories = await this.categoryRepository
        .createQueryBuilder('category')
        .where('category.id IN (:...ids)', { ids: Array.from(categoryIds) })
        .andWhere('category.isActive = true')
        .getMany();

      if (existingCategories.length !== categoryIds.size) {
        throw new BadRequestException('Some categories not found');
      }
    }
  }

  async create(createHomeSectionDto: CreateHomeSectionDto): Promise<HomeSection> {
    const { sectionType, config = {}, ...rest } = createHomeSectionDto;

    // Check if section type already exists
    const existing = await this.homeSectionRepository.findOne({
      where: { sectionType }
    });

    if (existing) {
      throw new BadRequestException(`Home section ${sectionType} already exists`);
    }

    // Validate config if provided
    if (Object.keys(config).length > 0) {
      await this.validateConfig(sectionType, config);
    }

    const homeSection = this.homeSectionRepository.create({
      sectionType,
      config,
      ...rest
    });

    return await this.homeSectionRepository.save(homeSection);
  }

  async findAll(): Promise<HomeSection[]> {
    return await this.homeSectionRepository.find({
      order: { sectionType: 'ASC' }
    });
  }

  async findByType(sectionType: HomeSectionType): Promise<HomeSection> {
    const homeSection = await this.homeSectionRepository.findOne({
      where: { sectionType }
    });

    if (!homeSection) {
      // Return default structure if not found
      return this.getDefaultSection(sectionType);
    }

    return homeSection;
  }

  async update(sectionType: HomeSectionType, updateHomeSectionDto: UpdateHomeSectionDto): Promise<HomeSection> {
    let homeSection = await this.homeSectionRepository.findOne({
      where: { sectionType }
    });

    if (!homeSection) {
      // Create if doesn't exist
      return this.create({
        sectionType,
        ...updateHomeSectionDto
      });
    }

    // Validate config if provided
    if (updateHomeSectionDto.config && Object.keys(updateHomeSectionDto.config).length > 0) {
      await this.validateConfig(sectionType, updateHomeSectionDto.config);
    }

    Object.assign(homeSection, updateHomeSectionDto);
    return await this.homeSectionRepository.save(homeSection);
  }

  async remove(sectionType: HomeSectionType): Promise<void> {
    const homeSection = await this.homeSectionRepository.findOne({
      where: { sectionType }
    });

    if (homeSection) {
      await this.homeSectionRepository.remove(homeSection);
    }
  }

  private getDefaultSection(sectionType: HomeSectionType): HomeSection {
    const baseSection = new HomeSection();
    baseSection.sectionType = sectionType;
    baseSection.isActive = false;
    baseSection.config = this.getDefaultConfig(sectionType);

    return baseSection;
  }

  private getDefaultConfig(sectionType: HomeSectionType): Record<string, any> {
    switch (sectionType) {
      case HomeSectionType.FEATURED_COURSES:
        return { courses: [] };
      case HomeSectionType.TRENDING:
        return { promoCards: [], categoryCourses: {} };
      case HomeSectionType.CATEGORY_SHOWCASE:
        return { categories: [] };
      case HomeSectionType.BESTSELLER:
      case HomeSectionType.TOP_RATED:
        return { courses: [] };
      default:
        return {};
    }
  }

  // Helper to get available content for frontend admin
  async getAvailableCourses(search?: string): Promise<Course[]> {
    const qb = this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('instructor.profile', 'profile')
      .where('course.status = :status', { status: 'published' })
      .andWhere('course.approval_status = :approvalStatus', { approvalStatus: 'approved' })
      .andWhere('course.isActive = true');

    if (search) {
      qb.andWhere('course.name ILIKE :search', { search: `%${search}%` });
    }

    return await qb.getMany();
  }

  async getAvailableCategories(search?: string): Promise<CourseCategory[]> {
    const qb = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.parentId IS NULL')
      .andWhere('category.isActive = true');

    if (search) {
      qb.andWhere('category.name ILIKE :search', { search: `%${search}%` });
    }

    return await qb.getMany();
  }

  async getPublicFeaturedCourses() {
    // Get the featured courses section from database
    const section = await this.findByType(HomeSectionType.FEATURED_COURSES);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        courses: []
      };
    }

    const config = section.config as any;

    // Return empty array if no courses configured
    if (!config.courses || !Array.isArray(config.courses) || config.courses.length === 0) {
      return {
        courses: []
      };
    }

    // Extract course IDs from the configuration
    const courseIds = config.courses.map((c: any) => c.courseId);

    // Get enriched course data
    const enrichedCourses = await this.getEnrichedCoursesByIds(courseIds);

    // Map back to the original order with enriched data
    const courses = config.courses.map((item: any) => {
      const courseData = enrichedCourses.find(c => c.courseId === item.courseId);

      if (!courseData) {
        return null; // Course not found or not available
      }

      return {
        order: item.order,
        courseId: item.courseId,
        courseName: item.displayTitle || courseData.courseName,
        courseImage: courseData.courseImage,
        courseDuration: courseData.courseDuration,
        courseDurationUnit: courseData.courseDurationUnit,
        totalHours: courseData.totalHours,
        instructorName: courseData.instructorName,
        instructorPhotoUrl: courseData.instructorPhotoUrl,
        enrolledStudents: courseData.enrolledStudents,
        averageRating: courseData.averageRating,
        ratingCount: courseData.ratingCount,
        totalLessons: courseData.totalLessons,
        pricing: courseData.pricing,
        isCourseFree: courseData.isCourseFree
      };
    }).filter(item => item !== null); // Remove courses that weren't found

    return {
      // isActive: section.isActive,
      courses: courses.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };
  }

  private async getEnrichedCoursesByIds(courseIds: string[]): Promise<any[]> {
    if (courseIds.length === 0) return [];

    // First, get the course data with all the existing fields
    const results = await this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.instructor', 'instructor')
      .innerJoin('instructor.profile', 'profile')
      .leftJoin('course.enrollments', 'enrollments')
      .leftJoin('course.sections', 'sections')
      .leftJoin('sections.items', 'items')
      .select([
        'course.id',
        'course.name',
        'course.averageRating',
        'course.ratingCount',
        'course.courseImage',
        'course.totalHours',
        'course.slug',
        'course.level',
        'course.courseDuration',
        'course.courseDurationUnit',
        'course.isCourseFree'
      ])
      .addSelect(
        `CONCAT(COALESCE(profile.firstName, ''), ' ', COALESCE(profile.lastName, ''))`,
        'instructorName',
      )
      .addSelect('profile.photoUrl', 'instructorPhotoUrl')
      .addSelect('COUNT(DISTINCT enrollments.id)', 'enrolledStudents')
      .addSelect('COUNT(DISTINCT items.id)', 'totalLessons')
      .where('course.id IN (:...ids)', { ids: courseIds })
      .andWhere('course.status = :status', { status: 'published' })
      .andWhere('course.isActive = true')
      .groupBy('course.id')
      .addGroupBy('course.name')
      .addGroupBy('course.averageRating')
      .addGroupBy('course.ratingCount')
      .addGroupBy('course.courseImage')
      .addGroupBy('course.slug')
      .addGroupBy('course.totalHours')
      .addGroupBy('course.level')
      .addGroupBy('course.courseDuration')
      .addGroupBy('course.courseDurationUnit')
      .addGroupBy('course.isCourseFree')
      .addGroupBy('profile.firstName')
      .addGroupBy('profile.lastName')
      .addGroupBy('profile.photoUrl')
      .getRawMany();

    // Get pricing data for all courses
    const pricingData = await this.getCoursePricing(courseIds);

    return results.map(result => ({
      courseId: result.course_id,
      courseName: result.course_name,
      courseImage: result.course_course_image,
      totalHours: parseFloat(result.course_total_hours) || 0,
      courseDuration: result.course_course_duration,
      courseDurationUnit: result.course_course_duration_unit,
      instructorName: result.instructorName?.trim() || 'Unknown Instructor',
      instructorPhotoUrl: result.instructorPhotoUrl,
      enrolledStudents: parseInt(result.enrolledStudents, 10) || 0,
      averageRating: Math.round((result.course_average_rating || 0) * 10) / 10,
      ratingCount: parseInt(result.course_rating_count, 10) || 0,
      totalLessons: parseInt(result.totalLessons, 10) || 0,
      isCourseFree: result.course_is_course_free,
      pricing: pricingData.get(result.course_id) || [] // Add pricing array
    }));
  }

  private async getCoursePricing(courseIds: string[]): Promise<Map<string, any[]>> {
    if (courseIds.length === 0) return new Map();

    const pricingResults = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.pricings', 'pricing')
      .select([
        'course.id AS course_id',
        'pricing.id AS pricing_id',
        'pricing.currencyCode',
        'pricing.regularPrice',
        'pricing.salePrice',
        'pricing.isActive',
        'pricing.created_at'
      ])
      .where('course.id IN (:...ids)', { ids: courseIds })
      .andWhere('pricing.isActive = :isActive', { isActive: true })
      .andWhere('pricing.deleted_at IS NULL')
      .getRawMany();

    // Group pricing by course ID
    const pricingMap = new Map<string, any[]>();

    pricingResults.forEach(pricing => {
      if (!pricing.course_id) return;

      const courseId = pricing.course_id;
      if (!pricingMap.has(courseId)) {
        pricingMap.set(courseId, []);
      }

      if (pricing.pricing_id) { // Only add if pricing exists
        pricingMap.get(courseId)!.push({
          id: pricing.pricing_id,
          currencyCode: pricing.pricing_currencyCode,
          regularPrice: parseFloat(pricing.pricing_regularPrice) || 0,
          salePrice: parseFloat(pricing.pricing_salePrice) || 0,
          isActive: pricing.pricing_isActive,
          createdAt: pricing.pricing_created_at
        });
      }
    });

    return pricingMap;
  }

  async getPublicTrending() {
    // Get the trending section from database
    const section = await this.findByType(HomeSectionType.TRENDING);

    // Return empty if section is not active
    if (!section.isActive) {
      return {
        promoCards: [],
        categoryCourses: []
      };
    }

    const config = section.config as any;

    // Return empty if no data configured
    if ((!config.promoCards || !Array.isArray(config.promoCards)) &&
      (!config.categoryCourses || !Array.isArray(config.categoryCourses))) {
      return {
        promoCards: [],
        categoryCourses: []
      };
    }

    // Process promo cards
    const promoCards = (config.promoCards || []).map((card: any) => ({
      linkUrl: card.linkUrl,
      order: card.order
    })).sort((a, b) => a.order - b.order);

    // Process category courses
    const categoryCourses = await this.processCategoryCourses(config.categoryCourses || []);

    return {
      promoCards,
      categoryCourses: categoryCourses.sort((a, b) => a.order - b.order)
    };
  }

  private async processCategoryCourses(categoryCourses: any[]): Promise<any[]> {
    if (categoryCourses.length === 0) return [];

    const results = [];

    for (const categoryItem of categoryCourses) {
      // Get category details
      const category = await this.categoryRepository.findOne({
        where: { id: categoryItem.categoryId }
      });

      if (!category) {
        continue; // Skip if category not found
      }

      // Extract course IDs from this category
      const courseIds = categoryItem.courses.map((c: any) => c.courseId);

      // Get enriched course data
      const enrichedCourses = await this.getEnrichedCoursesByIds(courseIds);

      // Map courses with enriched data
      const courses = categoryItem.courses.map((item: any) => {
        const courseData = enrichedCourses.find(c => c.courseId === item.courseId);

        if (!courseData) {
          return null; // Course not found or not available
        }

        return {
          order: item.order,
          courseId: item.courseId,
          courseName: courseData.courseName,
          courseImage: courseData.courseImage,
          courseDuration: courseData.courseDuration,
          courseDurationUnit: courseData.courseDurationUnit,
          totalHours: courseData.totalHours,
          instructorName: courseData.instructorName,
          instructorPhotoUrl: courseData.instructorPhotoUrl,
          enrolledStudents: courseData.enrolledStudents,
          averageRating: courseData.averageRating,
          ratingCount: courseData.ratingCount,
          totalLessons: courseData.totalLessons,
        };
      }).filter(item => item !== null)
        .sort((a, b) => a.order - b.order); // Ensure proper ordering

      results.push({
        order: categoryItem.order,
        categoryId: categoryItem.categoryId,
        categoryName: categoryItem.displayTitle || category.name,
        courses
      });
    }

    return results;
  }

  async getPublicCategoryShowcase() {
    // Get the category showcase section from database
    const section = await this.findByType(HomeSectionType.CATEGORY_SHOWCASE);

    // Return empty if section is not active
    if (!section.isActive) {
      return {
        categories: []
      };
    }

    const config = section.config as any;

    // Return empty if no categories configured
    if (!config.categories || !Array.isArray(config.categories) || config.categories.length === 0) {
      return {
        categories: []
      };
    }

    // Process categories with enriched data
    const categories = await this.processCategoriesWithCounts(config.categories);

    return {
      categories: categories.sort((a, b) => a.order - b.order)
    };
  }

  private async processCategoriesWithCounts(categoryItems: any[]): Promise<any[]> {
    if (categoryItems.length === 0) return [];

    const categoryIds = categoryItems.map((item: any) => item.categoryId);

    // First, get all categories (even if they have no courses)
    const allCategories = await this.categoryRepository
      .createQueryBuilder('category')
      .select([
        'category.id',
        'category.name',
        'category.image',
      ])
      .where('category.id IN (:...ids)', { ids: categoryIds })
      .andWhere('category.isActive = true')
      .getMany();

    // Get course counts for main categories (using correct column names)
    const mainCategoryCounts = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.category_id', 'category_id')
      .addSelect('COUNT(course.id)', 'courseCount')
      .where('course.category_id IN (:...ids)', { ids: categoryIds })
      .andWhere('course.status = :status', { status: 'published' })
      .andWhere('course.isActive = true')
      .groupBy('course.category_id')
      .getRawMany();

    // Get course counts for subcategories (using correct column names)
    const subCategoryCounts = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.subcategory_id', 'category_id')
      .addSelect('COUNT(course.id)', 'courseCount')
      .where('course.subcategory_id IN (:...ids)', { ids: categoryIds })
      .andWhere('course.status = :status', { status: 'published' })
      .andWhere('course.isActive = true')
      .groupBy('course.subcategory_id')
      .getRawMany();

    // Combine both counts
    const courseCountMap = new Map();

    // Add main category counts
    mainCategoryCounts.forEach(cat => {
      if (cat.category_id) {
        courseCountMap.set(cat.category_id, parseInt(cat.courseCount, 10) || 0);
      }
    });

    // Add subcategory counts (accumulate if category appears in both)
    subCategoryCounts.forEach(cat => {
      if (cat.category_id) {
        const currentCount = courseCountMap.get(cat.category_id) || 0;
        courseCountMap.set(cat.category_id, currentCount + (parseInt(cat.courseCount, 10) || 0));
      }
    });

    // Create a map for category details
    const categoryDetailsMap = new Map();
    allCategories.forEach(cat => {
      categoryDetailsMap.set(cat.id, {
        id: cat.id,
        name: cat.name,
        imageUrl: cat.image,
      });
    });

    // Map back to original order with enriched data
    return categoryItems.map((item: any) => {
      const categoryData = categoryDetailsMap.get(item.categoryId);

      if (!categoryData) {
        return null;
      }

      const courseCount = courseCountMap.get(item.categoryId) || 0;

      return {
        order: item.order,
        categoryId: item.categoryId,
        categoryName: item.displayTitle || categoryData.name,
        categoryImage: item.imageUrl || categoryData.imageUrl,
        courseCount: courseCount
      };
    }).filter(item => item !== null);
  }

  async getPublicBestseller() {
    // Get the bestseller section from database
    const section = await this.findByType(HomeSectionType.BESTSELLER);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        courses: []
      };
    }

    const config = section.config as any;

    // Return empty array if no courses configured
    if (!config.courses || !Array.isArray(config.courses) || config.courses.length === 0) {
      return {
        courses: []
      };
    }

    // Extract course IDs from the configuration
    const courseIds = config.courses.map((c: any) => c.courseId);

    // Get enriched course data
    const enrichedCourses = await this.getEnrichedCoursesByIds(courseIds);

    // Map back to the original order with enriched data
    const courses = config.courses.map((item: any) => {
      const courseData = enrichedCourses.find(c => c.courseId === item.courseId);

      if (!courseData) {
        return null; // Course not found or not available
      }

      return {
        order: item.order,
        courseId: item.courseId,
        courseName: item.displayTitle || courseData.courseName,
        courseImage: courseData.courseImage,
        courseDuration: courseData.courseDuration,
        courseDurationUnit: courseData.courseDurationUnit,
        totalHours: courseData.totalHours,
        instructorName: courseData.instructorName,
        instructorPhotoUrl: courseData.instructorPhotoUrl,
        enrolledStudents: courseData.enrolledStudents,
        averageRating: courseData.averageRating,
        ratingCount: courseData.ratingCount,
        totalLessons: courseData.totalLessons,
        pricing: courseData.pricing,
        isCourseFree: courseData.isCourseFree
      };
    }).filter(item => item !== null); // Remove courses that weren't found

    return {
      courses: courses.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };
  }

  async getPublicTopRated() {
    // Get the top rated section from database
    const section = await this.findByType(HomeSectionType.TOP_RATED);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        courses: []
      };
    }

    const config = section.config as any;

    // Return empty array if no courses configured
    if (!config.courses || !Array.isArray(config.courses) || config.courses.length === 0) {
      return {
        courses: []
      };
    }

    // Extract course IDs from the configuration
    const courseIds = config.courses.map((c: any) => c.courseId);

    // Get enriched course data
    const enrichedCourses = await this.getEnrichedCoursesByIds(courseIds);

    // Map back to the original order with enriched data
    const courses = config.courses.map((item: any) => {
      const courseData = enrichedCourses.find(c => c.courseId === item.courseId);

      if (!courseData) {
        return null; // Course not found or not available
      }

      return {
        order: item.order,
        courseId: item.courseId,
        courseName: item.displayTitle || courseData.courseName,
        courseImage: courseData.courseImage,
        courseDuration: courseData.courseDuration,
        courseDurationUnit: courseData.courseDurationUnit,
        totalHours: courseData.totalHours,
        instructorName: courseData.instructorName,
        instructorPhotoUrl: courseData.instructorPhotoUrl,
        enrolledStudents: courseData.enrolledStudents,
        averageRating: courseData.averageRating,
        ratingCount: courseData.ratingCount,
        totalLessons: courseData.totalLessons,
        pricing: courseData.pricing,
        isCourseFree: courseData.isCourseFree
      };
    }).filter(item => item !== null); // Remove courses that weren't found

    return {
      courses: courses.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };
  }
}