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
  CourseListConfig,
  TopBundleConfig,
  TopAcademiesConfig,
  TopInstructorsConfig,
  PromoCardsConfig,
  TrainingCoursesCardsConfig,
  BannerHomeSectionCardsConfig
} from './entities/home-section.entity';
import { CreateHomeSectionDto } from './dto/create-home-section.dto';
import { UpdateHomeSectionDto } from './dto/update-home-section.dto';
import { Course } from '../course/entities/course.entity';
import { CourseCategory } from '../course/course-category/entities/course-category.entity';
import { Bundle } from 'src/bundle/entities/bundle.entity';
import { BundlePricing } from 'src/bundle/entities/bundle-pricing.entity';
import { CourseBundle } from 'src/bundle/entities/course-bundle.entity';
import { Academy } from 'src/academy/entities/academy.entity';
import { User } from 'src/user/entities/user.entity';

// Type guards
const isFeaturedCoursesConfig = (config: any): config is FeaturedCoursesConfig => {
  return config && Array.isArray(config.courses);
};

const isTrendingConfig = (config: any): config is TrendingConfig => {
  return config &&
    Array.isArray(config.categoryCourses);
};

const isCategoryShowcaseConfig = (config: any): config is CategoryShowcaseConfig => {
  return config && Array.isArray(config.categories);
};

const isCourseListConfig = (config: any): config is CourseListConfig => {
  return config && Array.isArray(config.courses);
};

const isTopBundlesConfig = (config: any): config is TopBundleConfig => {
  return config && Array.isArray(config.bundles);
};

const isTopAcademiesConfig = (config: any): config is TopAcademiesConfig => {
  return config && Array.isArray(config.academies);
};

const isTopInstructorsConfig = (config: any): config is TopInstructorsConfig => {
  return config && Array.isArray(config.instructors);
};

const isPromoCardsConfig = (config: any): config is PromoCardsConfig => {
  return config && Array.isArray(config.promoCards);
};

const isTrainingCoursesCardsConfig = (config: any): config is TrainingCoursesCardsConfig => {
  return config && Array.isArray(config.trainingCoursesCards);
};

const isBannerHomeSectionCardsConfig = (config: any): config is BannerHomeSectionCardsConfig => {
  return config && Array.isArray(config.bannerHomeSectionCards);
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

      // Validate categories
      if (config.categoryCourses.length > 4) {
        throw new BadRequestException('Trending section cannot have more than 4 categories');
      }

      // Validate each category has exactly 3 courses
      config.categoryCourses.forEach((category: any, index: number) => {
        if (!category.courses || !Array.isArray(category.courses)) {
          throw new BadRequestException(`Category at position ${index} must have a courses array`);
        }
        if (category.courses.length > 3) {
          throw new BadRequestException(`Each category must have 3 courses only. Category ${index} has ${category.courses.length}`);
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
    maxCourses: 6,
    validate: (config: any) => {
      if (!isCourseListConfig(config)) {
        throw new BadRequestException('Invalid bestseller configuration');
      }
      if (config.courses.length > 3) {
        throw new BadRequestException('Bestseller section cannot exceed 6 courses');
      }
    }
  },
  [HomeSectionType.TOP_RATED]: {
    maxCourses: 6,
    validate: (config: any) => {
      if (!isCourseListConfig(config)) {
        throw new BadRequestException('Invalid top rated configuration');
      }
      if (config.courses.length > 3) {
        throw new BadRequestException('Top rated section cannot exceed 6 courses');
      }
    }
  },
  [HomeSectionType.TOP_BUNDLES]: {
    maxBundles: 6,
    validate: (config: any) => {
      if (!isTopBundlesConfig(config)) {
        throw new BadRequestException('Invalid top bundles configuration');
      }
      if (config.bundles.length > 6) {
        throw new BadRequestException('Top bundles cannot exceed 6 bundles');
      }
    }
  },
  [HomeSectionType.TOP_ACADEMIES]: {
    maxAcademies: 6,
    validate: (config: any) => {
      if (!isTopAcademiesConfig(config)) {
        throw new BadRequestException('Invalid top academies configuration');
      }
      if (config.academies.length > 6) {
        throw new BadRequestException('Top academies cannot exceed 6 academies');
      }
    }
  },
  [HomeSectionType.TOP_INSTRUCTORS]: {
    maxInstructors: 6,
    validate: (config: any) => {
      if (!isTopInstructorsConfig(config)) {
        throw new BadRequestException('Invalid top instrctors configuration');
      }
      if (config.instructors.length > 6) {
        throw new BadRequestException('Top instrctors cannot exceed 6 instructors');
      }
    }
  },
  [HomeSectionType.PROMO_CARDS]: {
    maxPromoCards: 2,
    validate: (config: any) => {
      if (!isPromoCardsConfig(config)) {
        throw new BadRequestException('Invalid promo cards configuration');
      }
      if (config.promoCards.length > 2) {
        throw new BadRequestException('promo codes cannot exceed 6 cards');
      }
      // Validate each promo card has required fields
      config.promoCards.forEach((card: any, index: number) => {
        if (!card.imageUrl) {
          throw new BadRequestException(`Promo card at position ${index} must have an imageUrl`);
        }
        if (!card.linkUrl) {
          throw new BadRequestException(`Promo card at position ${index} must have a linkUrl`);
        }
      });
      // Validate no duplicate orders
      const orders = config.promoCards.map((c: any) => c.order);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        throw new BadRequestException('Duplicate orders are not allowed in promo cards');
      }
    }
  },
  [HomeSectionType.TRAINING_COURSES_CARDS]: {
    maxTrainingCoursesCards: 2,
    validate: (config: any) => {
      if (!isTrainingCoursesCardsConfig(config)) {
        throw new BadRequestException('Invalid training courses cards configuration');
      }
      if (config.trainingCoursesCards.length > 2) {
        throw new BadRequestException('training courses cannot exceed 2 cards');
      }
      // Validate each promo card has required fields
      config.trainingCoursesCards.forEach((card: any, index: number) => {
        if (!card.imageUrl) {
          throw new BadRequestException(`Training courses cards at position ${index} must have an imageUrl`);
        }
        if (!card.linkUrl) {
          throw new BadRequestException(`Training courses cards at position ${index} must have a linkUrl`);
        }
      });
      // Validate no duplicate orders
      const orders = config.trainingCoursesCards.map((c: any) => c.order);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        throw new BadRequestException('Duplicate orders are not allowed in training courses cards');
      }
    }
  },
  [HomeSectionType.BANNER_HOME_SECTION_CARDS]: {
    maxBannerHomeSectionCards: 2,
    validate: (config: any) => {
      if (!isBannerHomeSectionCardsConfig(config)) {
        throw new BadRequestException('Invalid banner home section cards configuration');
      }
      if (config.bannerHomeSectionCards.length > 2) {
        throw new BadRequestException('banner home section cannot exceed 2 cards');
      }
      // Validate each promo card has required fields
      config.bannerHomeSectionCards.forEach((card: any, index: number) => {
        if (!card.imageUrl) {
          throw new BadRequestException(`Banner home section cards at position ${index} must have an imageUrl`);
        }
        if (!card.linkUrl) {
          throw new BadRequestException(`Banner home section cards at position ${index} must have a linkUrl`);
        }
      });
      // Validate no duplicate orders
      const orders = config.bannerHomeSectionCards.map((c: any) => c.order);
      const uniqueOrders = new Set(orders);
      if (uniqueOrders.size !== orders.length) {
        throw new BadRequestException('Duplicate orders are not allowed in banner home section cards');
      }
    }
  }
};

@Injectable()
export class HomeSectionService {
  // Simple in-memory cache for featured courses (TTL: 5 minutes)
  private featuredCoursesCache: Map<string, { data: any; expiresAt: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    @InjectRepository(HomeSection)
    private readonly homeSectionRepository: Repository<HomeSection>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseCategory)
    private readonly categoryRepository: Repository<CourseCategory>,
    @InjectRepository(Bundle)
    private readonly bundleRepository: Repository<Bundle>,
    @InjectRepository(BundlePricing)
    private readonly bundlePricingRepository: Repository<BundlePricing>,
    @InjectRepository(CourseBundle)
    private readonly courseBundleRepository: Repository<CourseBundle>,
    @InjectRepository(Academy)
    private readonly academyRepository: Repository<Academy>,
    @InjectRepository(User) // 🆕 Add this
    private readonly userRepository: Repository<User>,
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
    const bundleIds = new Set<string>();
    const academyIds = new Set<string>();
    const instructorIds = new Set<string>();

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
      case HomeSectionType.TOP_BUNDLES:
        if (isTopBundlesConfig(config)) { // Fixed: should be isTopBundlesConfig
          config.bundles.forEach(b => bundleIds.add(b.bundleId)); // Fixed: add to bundleIds, not courseIds
        }
        break;
      case HomeSectionType.TOP_ACADEMIES:
        if (isTopAcademiesConfig(config)) { // Fixed: should be isTopBundlesConfig
          config.academies.forEach(a => academyIds.add(a.academyId));
        }
        break;
      case HomeSectionType.TOP_INSTRUCTORS:
        if (isTopInstructorsConfig(config)) { // Fixed: should be isTopBundlesConfig
          config.instructors.forEach(i => instructorIds.add(i.instructorId));
        }
        break;
      case HomeSectionType.PROMO_CARDS:
      case HomeSectionType.TRAINING_COURSES_CARDS:
      case HomeSectionType.BANNER_HOME_SECTION_CARDS:
        // No entity validation needed for promo cards - they're just URLs and images
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

    // Validate bundles exist and are published/active - FIXED THIS SECTION
    if (bundleIds.size > 0) {
      const existingBundles = await this.bundleRepository
        .createQueryBuilder('bundle')
        .where('bundle.id IN (:...ids)', { ids: Array.from(bundleIds) })
        .andWhere('bundle.status = :status', { status: 'published' })
        .andWhere('bundle.active = :active', { active: true }) // Fixed: use 'active' not 'isActive'
        .getMany();

      if (existingBundles.length !== bundleIds.size) { // Fixed: check against bundleIds.size
        throw new BadRequestException('Some bundles not found or not available');
      }
    }

    // 🆕 Validate academies exist and are verified
    if (academyIds.size > 0) {
      const existingAcademies = await this.academyRepository
        .createQueryBuilder('academy')
        .where('academy.id IN (:...ids)', { ids: Array.from(academyIds) })
        //.andWhere('academy.isVerified = :isVerified', { isVerified: true })
        //.andWhere('academy.isActive = true')
        .getMany();

      if (existingAcademies.length !== academyIds.size) {
        throw new BadRequestException('Some academies not found or not verified');
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

  async findByType(sectionType: HomeSectionType): Promise<any> {
    const homeSection = await this.homeSectionRepository.findOne({
      where: { sectionType }
    });

    if (!homeSection) {
      // Return default structure if not found
      return this.getDefaultSection(sectionType);
    }

    // Enrich data based on section type
    switch (sectionType) {
      case HomeSectionType.FEATURED_COURSES:
        return await this.enrichFeaturedCourses(homeSection);

      case HomeSectionType.TRENDING:
        return await this.enrichTrending(homeSection);

      case HomeSectionType.CATEGORY_SHOWCASE:
        return await this.enrichCategoryShowcase(homeSection);

      case HomeSectionType.BESTSELLER:
        return await this.enrichCourseList(homeSection, 'bestseller');

      case HomeSectionType.TOP_RATED:
        return await this.enrichCourseList(homeSection, 'top_rated');

      case HomeSectionType.TOP_BUNDLES:
        return await this.enrichTopBundles(homeSection);

      case HomeSectionType.TOP_ACADEMIES:
        return await this.enrichTopAcademies(homeSection);

      case HomeSectionType.TOP_INSTRUCTORS:
        return await this.enrichTopInstructors(homeSection);

      case HomeSectionType.PROMO_CARDS:
        return await this.enrichPromoCards(homeSection);

      case HomeSectionType.TRAINING_COURSES_CARDS:
        return await this.enrichTrainingCoursesCards(homeSection);

      case HomeSectionType.BANNER_HOME_SECTION_CARDS:
        return await this.enrichBannerHomeSectionCards(homeSection);

      default:
        return homeSection; // Return as-is for unknown types
    }
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
        return { categoryCourses: {} };
      case HomeSectionType.PROMO_CARDS:
        return { promoCards: [] };
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
  // async getAvailableCourses(search?: string): Promise<Course[]> {
  //   const qb = this.courseRepository
  //     .createQueryBuilder('course')
  //     .leftJoinAndSelect('course.instructor', 'instructor')
  //     .leftJoinAndSelect('instructor.profile', 'profile')
  //     .where('course.status = :status', { status: 'published' })
  //     .andWhere('course.approval_status = :approvalStatus', { approvalStatus: 'approved' })
  //     .andWhere('course.isActive = true');

  //   if (search) {
  //     qb.andWhere('course.name ILIKE :search', { search: `%${search}%` });
  //   }

  //   return await qb.getMany();
  // }

  // async getAvailableCategories(search?: string): Promise<CourseCategory[]> {
  //   const qb = this.categoryRepository
  //     .createQueryBuilder('category')
  //     .where('category.parentId IS NULL')
  //     .andWhere('category.isActive = true');

  //   if (search) {
  //     qb.andWhere('category.name ILIKE :search', { search: `%${search}%` });
  //   }

  //   return await qb.getMany();
  // }

  async getPublicFeaturedCourses(userId?: string) {
    // Check cache first (cache key includes userId to handle favorites correctly)
    const cacheKey = `featured-courses:${userId || 'anonymous'}`;
    const cached = this.featuredCoursesCache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Get the featured courses section from database
    const section = await this.findByType(HomeSectionType.FEATURED_COURSES);

    // Return empty array if section is not active
    if (!section.isActive) {
      const result = { courses: [] };
      this.featuredCoursesCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + this.CACHE_TTL,
      });
      return result;
    }

    const config = section.config as any;

    // Return empty array if no courses configured
    if (!config.courses || !Array.isArray(config.courses) || config.courses.length === 0) {
      const result = { courses: [] };
      this.featuredCoursesCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + this.CACHE_TTL,
      });
      return result;
    }

    // Extract course IDs from the configuration
    const courseIds = config.courses.map((c: any) => c.courseId);

    // Get enriched course data with favorite status
    const enrichedCourses = await this.getEnrichedCoursesByIds(courseIds, userId);

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
        courseSlug: courseData.courseSlug,
        coursePreviewVideo: courseData.coursePreviewVideo,
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
        isCourseFree: courseData.isCourseFree,
        isFavorite: courseData.isFavorite // Add favorite status
      };
    }).filter(item => item !== null); // Remove courses that weren't found

    const result = {
      // isActive: section.isActive,
      courses: courses.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };

    // Cache the result
    this.featuredCoursesCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return result;
  }

  private async getEnrichedCoursesByIds(courseIds: string[], userId?: string): Promise<any[]> {
    if (courseIds.length === 0) return [];

    // Build query builder
    const qb = this.courseRepository
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
        'course.courseDuration',
        'course.courseDurationUnit',
        'course.isCourseFree',
        'course.slug',
        'course.previewVideo'
      ])
      .addSelect(
        `CONCAT(COALESCE(profile.firstName, ''), ' ', COALESCE(profile.lastName, ''))`,
        'instructorName',
      )
      .addSelect('profile.photoUrl', 'instructorPhotoUrl')
      .addSelect('COUNT(DISTINCT enrollments.id)', 'enrolledStudents')
      .addSelect(`COUNT(DISTINCT CASE WHEN items.curriculumType = 'lecture' THEN items.id END)`, 'totalLessons')
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
      .addGroupBy('profile.photoUrl');

    // ✅ FIX: Use parameterized EXISTS subquery instead of string interpolation (fixes SQL injection)
    if (userId) {
      qb.addSelect(
        `EXISTS (SELECT 1 FROM course_favorite cf WHERE cf.course_id = course.id AND cf.student_id = :userId)`,
        'isFavorite'
      );
      qb.setParameter('userId', userId);
    } else {
      qb.addSelect('false', 'isFavorite');
    }

    const results = await qb.getRawMany();

    // Get pricing data for all courses
    const pricingData = await this.getCoursePricing(courseIds);

    return results.map(result => ({
      courseId: result.course_id,
      courseName: result.course_name,
      courseImage: result.course_course_image,
      courseSlug: result.course_slug,
      coursePreviewVideo: result.course_preview_video,
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
      isFavorite: result.isFavorite === true || result.isFavorite === 'true', // Convert to boolean
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
        categoryCourses: [] // Remove promo cards from response
      };
    }

    const config = section.config as any;

    // Return empty if no data configured
    if (!config.categoryCourses || !Array.isArray(config.categoryCourses)) {
      return {
        categoryCourses: []
      };
    }

    // Process category courses only (no promo cards)
    const categoryCourses = await this.processCategoryCourses(config.categoryCourses || []);

    return {
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
        'category.description',
        'category.image',
        'category.svgIcon'
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
        description: cat.description,
        svgIcon: cat.svgIcon
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
        categoryDescription: categoryData.description,
        categoryImage: item.imageUrl || categoryData.imageUrl,
        categorySvgIcon: categoryData.svgIcon,
        courseCount: courseCount
      };
    }).filter(item => item !== null);
  }

  async getPublicBestseller(userId?: string) {
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

    // Get enriched course data with favorite status
    const enrichedCourses = await this.getEnrichedCoursesByIds(courseIds, userId);

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
        courseSlug: courseData.courseSlug,
        coursePreviewVideo: courseData.coursePreviewVideo,
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
        isCourseFree: courseData.isCourseFree,
        isFavorite: courseData.isFavorite // Add favorite status
      };
    }).filter(item => item !== null); // Remove courses that weren't found

    return {
      courses: courses.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };
  }

  async getPublicTopRated(userId?: string) {
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

    // Get enriched course data with favorite status
    const enrichedCourses = await this.getEnrichedCoursesByIds(courseIds, userId);

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
        courseSlug: courseData.courseSlug,
        coursePreviewVideo: courseData.coursePreviewVideo,
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
        isCourseFree: courseData.isCourseFree,
        isFavorite: courseData.isFavorite // Add favorite status
      };
    }).filter(item => item !== null); // Remove courses that weren't found

    return {
      courses: courses.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };
  }

  private async enrichFeaturedCourses(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.courses || !Array.isArray(config.courses) || config.courses.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          courses: []
        }
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
        courseSlug: courseData.courseSlug,
        coursePreviewVideo: courseData.coursePreviewVideo,
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
    }).filter(item => item !== null).sort((a, b) => a.order - b.order);

    return {
      ...section,
      config: {
        ...config,
        courses
      }
    };
  }

  private async enrichTrending(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive) {
      return {
        ...section,
        config: {
          categoryCourses: [] // Remove promo cards
        }
      };
    }

    // Process category courses only
    const categoryCourses = await this.processCategoryCourses(config.categoryCourses || []);

    return {
      ...section,
      config: {
        categoryCourses: categoryCourses.sort((a, b) => a.order - b.order)
      }
    };
  }

  private async enrichCategoryShowcase(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.categories || !Array.isArray(config.categories) || config.categories.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          categories: []
        }
      };
    }

    // Process categories with enriched data
    const categories = await this.processCategoriesWithCounts(config.categories);

    return {
      ...section,
      config: {
        ...config,
        categories: categories.sort((a, b) => a.order - b.order)
      }
    };
  }

  private async enrichCourseList(section: HomeSection, type: string): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.courses || !Array.isArray(config.courses) || config.courses.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          courses: []
        }
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
        courseSlug: courseData.courseSlug,
        coursePreviewVideo: courseData.coursePreviewVideo,
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
    }).filter(item => item !== null).sort((a, b) => a.order - b.order);

    return {
      ...section,
      config: {
        ...config,
        courses
      }
    };
  }

  private async enrichTopBundles(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.bundles || !Array.isArray(config.bundles) || config.bundles.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          bundles: []
        }
      };
    }

    // Extract bundle IDs from the configuration
    const bundleIds = config.bundles.map((b: any) => b.bundleId);

    // Get enriched bundle data
    const enrichedBundles = await this.getEnrichedBundlesByIds(bundleIds);

    // Map back to the original order with enriched data
    const bundles = config.bundles.map((item: any) => {
      const bundleData = enrichedBundles.find(b => b.bundleId === item.bundleId);

      if (!bundleData) {
        return null; // Bundle not found or not available
      }

      return {
        order: item.order,
        bundleId: item.bundleId,
        bundleName: item.displayTitle || bundleData.bundleName,
        bundleImage: bundleData.bundleImage,
        slug: bundleData.slug,
        description: bundleData.description,
        originalPrice: bundleData.originalPrice,
        salePrice: bundleData.salePrice,
        discountPercentage: bundleData.discountPercentage,
        totalCourses: bundleData.totalCourses,
        totalStudents: bundleData.totalStudents,
        numberOfPurchases: bundleData.numberOfPurchases,
        revenue: bundleData.revenue,
        isFree: bundleData.isFree,
        pricing: bundleData.pricing
      };
    }).filter(item => item !== null).sort((a, b) => a.order - b.order);

    return {
      ...section,
      config: {
        ...config,
        bundles
      }
    };
  }

  async getPublicTopBundles() {
    // Get the top bundles section from database
    const section = await this.findByType(HomeSectionType.TOP_BUNDLES);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        bundles: []
      };
    }

    const config = section.config as any;

    // Return empty array if no bundles configured
    if (!config.bundles || !Array.isArray(config.bundles) || config.bundles.length === 0) {
      return {
        bundles: []
      };
    }

    // Extract bundle IDs from the configuration
    const bundleIds = config.bundles.map((b: any) => b.bundleId);

    // Get enriched bundle data
    const enrichedBundles = await this.getEnrichedBundlesByIds(bundleIds);

    // Map back to the original order with enriched data
    const bundles = config.bundles.map((item: any) => {
      const bundleData = enrichedBundles.find(b => b.bundleId === item.bundleId);

      if (!bundleData) {
        return null; // Bundle not found or not available
      }

      return {
        order: item.order,
        bundleId: item.bundleId,
        bundleName: item.displayTitle || bundleData.bundleName,
        bundleImage: bundleData.bundleImage,
        slug: bundleData.slug,
        description: bundleData.description,
        originalPrice: bundleData.originalPrice,
        salePrice: bundleData.salePrice,
        discountPercentage: bundleData.discountPercentage,
        totalCourses: bundleData.totalCourses,
        totalStudents: bundleData.totalStudents,
        averageRating: bundleData.averageRating,
        ratingCount: bundleData.ratingCount,
        isFree: bundleData.isFree,
        instructorName: bundleData.instructorName,
        instructorPhotoUrl: bundleData.instructorPhotoUrl,
        individualCoursesTotal: bundleData.individualCoursesTotal,
        savingsAmount: bundleData.savingsAmount,
        savingsPercentage: bundleData.savingsPercentage,
        courses: bundleData.courses, // Include course details
        pricing: bundleData.pricing
      };
    }).filter(item => item !== null); // Remove bundles that weren't found

    return {
      bundles: bundles.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };
  }

  private async getEnrichedBundlesByIds(bundleIds: string[]): Promise<any[]> {
    if (bundleIds.length === 0) return [];

    try {
      // Get bundle basic data with course count, student count, and instructor info
      const bundleResults = await this.bundleRepository
        .createQueryBuilder('bundle')
        .leftJoin('bundle.courseBundles', 'courseBundles')
        .leftJoin('courseBundles.course', 'course')
        .leftJoin('course.enrollments', 'enrollments')
        .leftJoin('bundle.instructor', 'instructor')
        .leftJoin('instructor.profile', 'profile')
        .select([
          'bundle.id',
          'bundle.title',
          'bundle.slug',
          'bundle.description',
          'bundle.thumbnail_url',
          'bundle.is_free',
          'bundle.number_of_purchases',
          'bundle.revenue',
        ])
        .addSelect(
          `CONCAT(COALESCE(profile.firstName, ''), ' ', COALESCE(profile.lastName, ''))`,
          'instructorName',
        )
        .addSelect('profile.photoUrl', 'instructorPhotoUrl')
        .addSelect('COUNT(DISTINCT courseBundles.course_id)', 'totalCourses')
        //.addSelect('COUNT(DISTINCT enrollments.id)', 'totalStudents')
        .where('bundle.id IN (:...ids)', { ids: bundleIds })
        .andWhere('bundle.status = :status', { status: 'published' })
        .andWhere('bundle.active = :active', { active: true })
        .groupBy('bundle.id')
        .addGroupBy('profile.firstName')
        .addGroupBy('profile.lastName')
        .addGroupBy('profile.photoUrl')
        .getRawMany();

      // Get pricing data for all bundles
      const pricingData = await this.getBundlePricing(bundleIds);

      // Get course details and individual pricing for each bundle
      const bundleCoursesData = await this.getBundleCoursesWithPricing(bundleIds);

      return bundleResults.map(result => {
        const bundleId = result.bundle_id;
        const pricing = pricingData.get(bundleId) || [];
        const bundleCourses = bundleCoursesData.get(bundleId) || [];

        // Find the primary pricing (USD or first available)
        // const primaryPricing = pricing.find(p => p.currencyCode === 'USD') || pricing[0] || {};

        // const originalPrice = primaryPricing.regularPrice || 0;
        // const salePrice = primaryPricing.salePrice || originalPrice;

        // Calculate individual course prices total
        // const individualCoursesTotal = bundleCourses.reduce((total, course) => {
        //   const coursePrice = course.finalPrice || 0;
        //   return total + coursePrice;
        // }, 0);

        // // Calculate savings
        // const savingsAmount = individualCoursesTotal - salePrice;
        // const savingsPercentage = individualCoursesTotal > 0
        //   ? Math.round((savingsAmount / individualCoursesTotal) * 100)
        //   : 0;

        // const discountPercentage = originalPrice > 0 && salePrice < originalPrice
        //   ? Math.round((1 - salePrice / originalPrice) * 100)
        //   : 0;

        return {
          bundleId: bundleId,
          bundleName: result.bundle_title,
          bundleImage: result.bundle_thumbnail_url,
          slug: result.bundle_slug,
          description: result.bundle_description,
          //originalPrice: originalPrice,
          //salePrice: salePrice,
          //discountPercentage: discountPercentage,
          totalCourses: parseInt(result.totalCourses, 10) || 0,
          totalStudents: parseInt(result.totalStudents, 10) || 0,
          averageRating: parseFloat(result.bundle_average_rating) || 0,
          ratingCount: parseInt(result.bundle_rating_count, 10) || 0,
          numberOfPurchases: parseInt(result.bundle_number_of_purchases, 10) || 0,
          revenue: parseFloat(result.bundle_revenue) || 0,
          isFree: result.bundle_is_free,
          instructorName: result.instructorName?.trim() || 'Unknown Instructor',
          instructorPhotoUrl: result.instructorPhotoUrl,
          //individualCoursesTotal: individualCoursesTotal,
          //savingsAmount: savingsAmount > 0 ? savingsAmount : 0,
          //savingsPercentage: savingsPercentage > 0 ? savingsPercentage : 0,
          courses: bundleCourses, // This now contains course details with pricing
          pricing: pricing
        };
      });
    } catch (error) {
      console.error('Error fetching enriched bundles:', error);
      return [];
    }
  }

  private async getBundleCoursesWithPricing(bundleIds: string[]): Promise<Map<string, any[]>> {
    if (bundleIds.length === 0) return new Map();

    const courseResults = await this.courseBundleRepository
      .createQueryBuilder('courseBundle')
      .innerJoin('courseBundle.bundle', 'bundle')
      .innerJoin('courseBundle.course', 'course')
      .leftJoin('course.instructor', 'instructor')
      .leftJoin('instructor.profile', 'profile')
      .leftJoin('course.pricings', 'pricing', 'pricing.isActive = :pricingActive AND pricing.deleted_at IS NULL', {
        pricingActive: true
      })
      .select([
        'bundle.id AS bundle_id',
        'course.id AS course_id',
        'course.name AS course_name',
        'course.slug AS course_slug',
        'course.courseImage AS course_image',
        'course.totalHours AS course_total_hours',
        'course.level AS course_level'
      ])
      .addSelect(
        `CONCAT(COALESCE(profile.firstName, ''), ' ', COALESCE(profile.lastName, ''))`,
        'instructorName',
      )
      .addSelect('pricing.currencyCode AS pricing_currency_code')
      .addSelect('pricing.regularPrice AS pricing_regular_price')
      .addSelect('pricing.salePrice AS pricing_sale_price')
      .where('bundle.id IN (:...ids)', { ids: bundleIds })
      .andWhere('course.status = :status', { status: 'published' })
      .andWhere('course.isActive = true')
      .orderBy('courseBundle.created_at', 'ASC')
      .getRawMany();

    // Group courses by bundle ID and get the best pricing for each course
    const bundleCoursesMap = new Map<string, any[]>();

    courseResults.forEach(row => {
      const bundleId = row.bundle_id;
      const courseId = row.course_id;

      if (!bundleCoursesMap.has(bundleId)) {
        bundleCoursesMap.set(bundleId, []);
      }

      const existingCourses = bundleCoursesMap.get(bundleId)!;
      const existingCourse = existingCourses.find(c => c.courseId === courseId);

      if (existingCourse) {
        // If course already exists, add pricing option
        if (row.pricing_currency_code) {
          existingCourse.pricing.push({
            currencyCode: row.pricing_currency_code,
            regularPrice: parseFloat(row.pricing_regular_price) || 0,
            salePrice: parseFloat(row.pricing_sale_price) || null
          });
        }
      } else {
        // Create new course entry
        const coursePricing = [];

        // Define a type for pricing objects
        type PricingType = {
          currencyCode: string;
          regularPrice: number;
          salePrice: number | null;
        };

        // Find best pricing with proper type handling
        // const bestPricing: Partial<PricingType> = coursePricing.find((p: PricingType) => p.currencyCode === 'USD') || coursePricing[0] || {};

        // const regularPrice = (bestPricing as PricingType).regularPrice || 0;
        // const salePrice = (bestPricing as PricingType).salePrice || null;
        // const coursePrice = salePrice || regularPrice;

        existingCourses.push({
          courseId: courseId,
          courseName: row.course_name,
          courseSlug: row.course_slug,
          courseImage: row.course_image,
          totalHours: parseFloat(row.course_total_hours) || 0,
          level: row.course_level,
          instructorName: row.instructorName?.trim() || 'Unknown Instructor',
          // regularPrice: regularPrice,
          // salePrice: salePrice,
          // finalPrice: coursePrice,
          pricing: coursePricing
        });
      }
    });

    return bundleCoursesMap;
  }

  private async getBundlePricing(bundleIds: string[]): Promise<Map<string, any[]>> {
    if (bundleIds.length === 0) return new Map();

    const pricingResults = await this.bundlePricingRepository
      .createQueryBuilder('pricing')
      .innerJoin('pricing.bundle', 'bundle')
      .select([
        'bundle.id AS bundle_id',
        'pricing.id AS pricing_id',
        'pricing.currency_code',
        'pricing.regular_price',
        'pricing.sale_price',
        'pricing.discount_amount',
        'pricing.discount_enabled',
        'pricing.is_active'
      ])
      .where('bundle.id IN (:...ids)', { ids: bundleIds })
      .andWhere('pricing.is_active = :isActive', { isActive: true })
      .andWhere('pricing.deleted_at IS NULL')
      .getRawMany();

    // Group pricing by bundle ID
    const pricingMap = new Map<string, any[]>();

    pricingResults.forEach(pricing => {
      if (!pricing.bundle_id) return;

      const bundleId = pricing.bundle_id;
      if (!pricingMap.has(bundleId)) {
        pricingMap.set(bundleId, []);
      }

      if (pricing.pricing_id) {
        pricingMap.get(bundleId)!.push({
          id: pricing.pricing_id,
          currencyCode: pricing.pricing_currency_code,
          regularPrice: parseFloat(pricing.pricing_regular_price) || 0,
          salePrice: parseFloat(pricing.pricing_sale_price) || null,
          discountAmount: parseFloat(pricing.pricing_discount_amount) || null,
          discountEnabled: pricing.pricing_discount_enabled,
          isActive: pricing.pricing_is_active
        });
      }
    });

    return pricingMap;
  }

  async getPublicTopAcademies() {
    // Get the top academies section from database
    const section = await this.findByType(HomeSectionType.TOP_ACADEMIES);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        academies: []
      };
    }

    const config = section.config as any;

    // Return empty array if no academies configured
    if (!config.academies || !Array.isArray(config.academies) || config.academies.length === 0) {
      return {
        academies: []
      };
    }

    // Extract academy IDs from the configuration
    const academyIds = config.academies.map((a: any) => a.academyId);

    // Get enriched academy data
    const enrichedAcademies = await this.getEnrichedAcademiesByIds(academyIds);

    // Map back to the original order with enriched data
    const academies = config.academies.map((item: any) => {
      const academyData = enrichedAcademies.find(a => a.academyId === item.academyId);

      if (!academyData) {
        return null; // Academy not found or not available
      }

      return {
        order: item.order,
        academyId: item.academyId,
        academyName: item.displayTitle || academyData.academyName,
        slug: academyData.slug,
        image: academyData.image,
        cover: academyData.cover,
        description: academyData.description,
        keywords: academyData.keywords,
        type: academyData.type,
        foundedYear: academyData.foundedYear,
        address: academyData.address,
        city: academyData.city,
        country: academyData.country,
        email: academyData.email,
        phone: academyData.phone,
        fakeStudentsCount: academyData.fakeStudentsCount,
        displayRealStudentCount: academyData.displayRealStudentsCount,
        realStudentsCount: academyData.uniqueStudentsCount,
        totalCourses: academyData.totalCourses,
        averageRating: academyData.averageRating,
        ratingCount: academyData.ratingCount,
        completionPercentage: academyData.completionPercentage,
        isVerified: academyData.isVerified,
        socialLinks: academyData.socialLinks,
        contactPerson: academyData.contactPerson
      };
    }).filter(item => item !== null); // Remove academies that weren't found

    return {
      academies: academies.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };
  }

  private async enrichTopAcademies(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.academies || !Array.isArray(config.academies) || config.academies.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          academies: []
        }
      };
    }

    // Extract academy IDs from the configuration
    const academyIds = config.academies.map((a: any) => a.academyId);

    // Get enriched academy data
    const enrichedAcademies = await this.getEnrichedAcademiesByIds(academyIds);

    // Map back to the original order with enriched data
    const academies = config.academies.map((item: any) => {
      const academyData = enrichedAcademies.find(a => a.academyId === item.academyId);

      if (!academyData) {
        return null; // Academy not found or not available
      }

      return {
        order: item.order,
        academyId: item.academyId,
        academyName: item.displayTitle || academyData.academyName,
        slug: academyData.slug,
        image: academyData.image,
        cover: academyData.cover,
        description: academyData.description,
        type: academyData.type,
        keywords: academyData.keywords,
        foundedYear: academyData.foundedYear,
        address: academyData.address,
        city: academyData.city,
        country: academyData.country,
        email: academyData.email,
        phone: academyData.phone,
        fakeStudentsCount: academyData.fakeStudentsCount,
        displayRealStudentCount: academyData.displayRealStudentsCount,
        realStudentsCount: academyData.uniqueStudentsCount,
        totalCourses: academyData.totalCourses,
        averageRating: academyData.averageRating,
        ratingCount: academyData.ratingCount,
        completionPercentage: academyData.completionPercentage,
        isVerified: academyData.isVerified,
        socialLinks: academyData.socialLinks,
        contactPerson: academyData.contactPerson
      };
    }).filter(item => item !== null).sort((a, b) => a.order - b.order);

    return {
      ...section,
      config: {
        ...config,
        academies
      }
    };
  }

  private async getEnrichedAcademiesByIds(academyIds: string[]): Promise<any[]> {
    if (academyIds.length === 0) return [];

    try {
      // Get academy basic data
      const academyResults = await this.academyRepository
        .createQueryBuilder('academy')
        .select([
          'academy.id',
          'academy.name',
          'academy.slug',
          'academy.image',
          'academy.cover',
          'academy.description',
          'academy.type',
          'academy.keyWords',
          'academy.studentsCount',
          'academy.fakeStudentsCount',
          'academy.isVerified',
          'academy.socialLinks',
          'academy.contactPerson',
          'academy.displayRealStudentsCount',
          'academy.foundedYear',
          'academy.address',
          'academy.city',
          'academy.country',
          'academy.email',
          'academy.phone'
        ])
        .where('academy.id IN (:...ids)', { ids: academyIds })
        //.andWhere('academy.isVerified = :isVerified', { isVerified: true })
        .getMany();

      // Get course counts for each academy
      const courseCounts = await this.courseRepository
        .createQueryBuilder('course')
        .select('course.academy_id', 'academyId')
        .addSelect('COUNT(course.id)', 'totalCourses')
        .where('course.academy_id IN (:...ids)', { ids: academyIds })
        .andWhere('course.status = :status', { status: 'published' })
        .andWhere('course.isActive = true')
        .groupBy('course.academy_id')
        .getRawMany();

      // Get unique student counts for each academy (students enrolled in academy courses)
      const studentCounts = await this.courseRepository
        .createQueryBuilder('course')
        .leftJoin('course.enrollments', 'enrollments')
        .leftJoin('enrollments.student', 'student')
        .select('course.academy_id', 'academyId')
        .addSelect('COUNT(DISTINCT student.id)', 'uniqueStudents')
        .where('course.academy_id IN (:...ids)', { ids: academyIds })
        .andWhere('course.status = :status', { status: 'published' })
        .andWhere('course.isActive = true')
        .groupBy('course.academy_id')
        .getRawMany();

      // Get average ratings for academy courses
      // const ratingStats = await this.courseRepository
      //   .createQueryBuilder('course')
      //   .leftJoin('course.reviews', 'reviews')
      //   .select('course.academy_id', 'academyId')
      //   .addSelect('AVG(reviews.rating)', 'averageRating')
      //   .addSelect('COUNT(DISTINCT reviews.id)', 'ratingCount')
      //   .where('course.academy_id IN (:...ids)', { ids: academyIds })
      //   .andWhere('course.status = :status', { status: 'published' })
      //   .andWhere('course.isActive = true')
      //   .andWhere('reviews.rating IS NOT NULL')
      //   .groupBy('course.academy_id')
      //   .getRawMany();

      // Create maps for easy lookup
      const courseCountMap = new Map();
      const studentCountMap = new Map();
      // const ratingMap = new Map();

      courseCounts.forEach(item => {
        courseCountMap.set(item.academyId, parseInt(item.totalCourses, 10) || 0);
      });

      studentCounts.forEach(item => {
        studentCountMap.set(item.academyId, parseInt(item.uniqueStudents, 10) || 0);
      });

      // ratingStats.forEach(item => {
      //   ratingMap.set(item.academyId, {
      //     averageRating: Math.round((parseFloat(item.averageRating) || 0) * 10) / 10,
      //     ratingCount: parseInt(item.ratingCount, 10) || 0
      //   });
      // });

      return academyResults.map(academy => {
        const courseCount = courseCountMap.get(academy.id) || 0;
        const uniqueStudents = studentCountMap.get(academy.id) || 0;
        // const ratingData = ratingMap.get(academy.id) || { averageRating: 0, ratingCount: 0 };

        // Calculate student count (real or fake based on display preference)
        // const displayRealStudents = academy.displayRealStudentsCount !== false;
        // const studentCount = displayRealStudents
        //   ? (academy.studentsCount || uniqueStudents || 0)
        //   : (academy.fakeStudentsCount || academy.studentsCount || uniqueStudents || 0);

        return {
          academyId: academy.id,
          academyName: academy.name,
          slug: academy.slug,
          image: academy.image,
          cover: academy.cover,
          description: academy.description,
          type: academy.type,
          keywords: academy.keyWords,
          foundedYear: academy.foundedYear,
          address: academy.address,
          city: academy.city,
          country: academy.country,
          email: academy.email,
          phone: academy.phone,
          fakeStudentsCount: academy.fakeStudentsCount || 0,
          displayRealStudentsCount: academy.displayRealStudentsCount,
          uniqueStudentsCount: uniqueStudents, // Actual unique students from enrollments
          totalCourses: courseCount,
          averageRating: 0, //ratingData.averageRating,
          ratingCount: 0, //ratingData.ratingCount,
          isVerified: academy.isVerified,
          socialLinks: academy.socialLinks,
          contactPerson: academy.contactPerson
        };
      });
    } catch (error) {
      console.error('Error fetching enriched academies:', error);
      return [];
    }
  }

  async getPublicTopInstructors() {
    // Get the top instructors section from database
    const section = await this.findByType(HomeSectionType.TOP_INSTRUCTORS);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        instructors: []
      };
    }

    const config = section.config as any;

    // Return empty array if no instructors configured
    if (!config.instructors || !Array.isArray(config.instructors) || config.instructors.length === 0) {
      return {
        instructors: []
      };
    }

    // Extract instructor IDs from the configuration
    const instructorIds = config.instructors.map((i: any) => i.instructorId);

    // Get enriched instructor data
    const enrichedInstructors = await this.getEnrichedInstructorsByIds(instructorIds);

    // Map back to the original order with enriched data
    const instructors = config.instructors.map((item: any) => {
      const instructorData = enrichedInstructors.find(i => i.instructorId === item.instructorId);

      if (!instructorData) {
        return null; // Instructor not found or no published courses
      }

      return {
        order: item.order,
        instructorId: item.instructorId,
        instructorName: item.displayTitle || instructorData.instructorName,
        photoUrl: instructorData.photoUrl,
        metadata: instructorData.metadata,
        totalCourses: instructorData.totalCourses,
        totalStudents: instructorData.totalStudents,
        averageRating: instructorData.averageRating,
        socialLinks: instructorData.socialLinks
      };
    }).filter(item => item !== null); // Remove instructors that weren't found

    return {
      instructors: instructors.sort((a, b) => a.order - b.order) // Ensure proper ordering
    };
  }

  private async enrichTopInstructors(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.instructors || !Array.isArray(config.instructors) || config.instructors.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          instructors: []
        }
      };
    }

    // Extract instructor IDs from the configuration
    const instructorIds = config.instructors.map((i: any) => i.instructorId);

    // Get enriched instructor data
    const enrichedInstructors = await this.getEnrichedInstructorsByIds(instructorIds);

    // Map back to the original order with enriched data
    const instructors = config.instructors.map((item: any) => {
      const instructorData = enrichedInstructors.find(i => i.instructorId === item.instructorId);

      if (!instructorData) {
        return null; // Instructor not found or no published courses
      }

      return {
        order: item.order,
        instructorId: item.instructorId,
        instructorName: item.displayTitle || instructorData.instructorName,
        photoUrl: instructorData.photoUrl,
        metadata: instructorData.metadata,
        totalCourses: instructorData.totalCourses,
        totalStudents: instructorData.totalStudents,
        averageRating: instructorData.averageRating,
        socialLinks: instructorData.socialLinks
      };
    }).filter(item => item !== null).sort((a, b) => a.order - b.order);

    return {
      ...section,
      config: {
        ...config,
        instructors
      }
    };
  }

  private async getEnrichedInstructorsByIds(instructorIds: string[]): Promise<any[]> {
    if (instructorIds.length === 0) return [];

    try {
      // First, get all instructor profiles (even if they have no courses)
      const allInstructors = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.profile', 'profile')
        .select([
          'user.id AS instructor_id',
          'profile.firstName AS first_name',
          'profile.lastName AS last_name',
          'profile.photoUrl AS photo_url',
          'profile.metadata AS metadata',
          'profile.averageRating AS average_rating',
          'profile.userName AS user_name'
        ])
        .where('user.id IN (:...ids)', { ids: instructorIds })
        .getRawMany();

      // Then get course counts for those who have courses
      const courseStats = await this.courseRepository
        .createQueryBuilder('course')
        .innerJoin('course.instructor', 'instructor')
        .leftJoin('course.enrollments', 'enrollments')
        .leftJoin('enrollments.student', 'student')
        .select([
          'instructor.id AS instructor_id',
          'COUNT(DISTINCT course.id) AS total_courses',
          'COUNT(DISTINCT student.id) AS total_students'
        ])
        .where('instructor.id IN (:...ids)', { ids: instructorIds })
        .andWhere('course.status = :status', { status: 'published' })
        .andWhere('course.isActive = true')
        .groupBy('instructor.id')
        .getRawMany();

      // Create a map for course stats
      const courseStatsMap = new Map();
      courseStats.forEach(stat => {
        courseStatsMap.set(stat.instructor_id, {
          totalCourses: parseInt(stat.total_courses, 10) || 0,
          totalStudents: parseInt(stat.total_students, 10) || 0
        });
      });

      // Combine the data
      return allInstructors.map(instructor => {
        const stats = courseStatsMap.get(instructor.instructor_id) || {
          totalCourses: 0,
          totalStudents: 0
        };

        return {
          instructorId: instructor.instructor_id,
          instructorName: `${instructor.first_name || ''} ${instructor.last_name || ''}`.trim(),
          userName: instructor.user_name,
          photoUrl: instructor.photo_url,
          metadata: instructor.metadata,
          totalCourses: stats.totalCourses,
          totalStudents: stats.totalStudents,
          averageRating: Math.round((parseFloat(instructor.average_rating) || 0) * 10) / 10,
        };
      });
    } catch (error) {
      console.error('Error fetching enriched instructors:', error);
      return [];
    }
  }

  async getPublicPromoCards() {
    // Get the promo cards section from database
    const section = await this.findByType(HomeSectionType.PROMO_CARDS);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        promoCards: []
      };
    }

    const config = section.config as any;

    // Return empty array if no promo cards configured
    if (!config.promoCards || !Array.isArray(config.promoCards) || config.promoCards.length === 0) {
      return {
        promoCards: []
      };
    }

    // Process promo cards (only return active ones)
    const promoCards = config.promoCards
      .filter((card: any) => card.isActive !== false) // Filter out inactive cards
      .map((card: any) => ({
        order: card.order,
        imageUrl: card.imageUrl,
        linkUrl: card.linkUrl,
      }))
      .sort((a, b) => a.order - b.order);

    return {
      promoCards
    };
  }

  private async enrichPromoCards(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.promoCards || !Array.isArray(config.promoCards) || config.promoCards.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          promoCards: []
        }
      };
    }

    // Process promo cards
    const promoCards = config.promoCards.map((card: any) => ({
      imageUrl: card.imageUrl,
      linkUrl: card.linkUrl,
      order: card.order
    })).sort((a, b) => a.order - b.order);

    return {
      ...section,
      config: {
        ...config,
        promoCards
      }
    };
  }

  async getPublicTrainingCoursesCards() {
    // Get the promo cards section from database
    const section = await this.findByType(HomeSectionType.TRAINING_COURSES_CARDS);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        trainingCoursesCards: []
      };
    }

    const config = section.config as any;

    // Return empty array if no promo cards configured
    if (!config.trainingCoursesCards || !Array.isArray(config.trainingCoursesCards) || config.trainingCoursesCards.length === 0) {
      return {
        trainingCoursesCards: []
      };
    }

    // Process promo cards (only return active ones)
    const trainingCoursesCards = config.trainingCoursesCards
      .filter((card: any) => card.isActive !== false) // Filter out inactive cards
      .map((card: any) => ({
        order: card.order,
        imageUrl: card.imageUrl,
        linkUrl: card.linkUrl,
      }))
      .sort((a, b) => a.order - b.order);

    return {
      trainingCoursesCards
    };
  }

  private async enrichTrainingCoursesCards(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.trainingCoursesCards || !Array.isArray(config.trainingCoursesCards) || config.trainingCoursesCards.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          trainingCoursesCards: []
        }
      };
    }

    // Process promo cards
    const trainingCoursesCards = config.trainingCoursesCards.map((card: any) => ({
      imageUrl: card.imageUrl,
      linkUrl: card.linkUrl,
      order: card.order
    })).sort((a, b) => a.order - b.order);

    return {
      ...section,
      config: {
        ...config,
        trainingCoursesCards
      }
    };
  }

  async getPublicBannerHomeSectionCards() {
    // Get the promo cards section from database
    const section = await this.findByType(HomeSectionType.BANNER_HOME_SECTION_CARDS);

    // Return empty array if section is not active
    if (!section.isActive) {
      return {
        bannerHomeSectionCards: []
      };
    }

    const config = section.config as any;

    // Return empty array if no promo cards configured
    if (!config.bannerHomeSectionCards || !Array.isArray(config.bannerHomeSectionCards) || config.bannerHomeSectionCards.length === 0) {
      return {
        bannerHomeSectionCards: []
      };
    }

    // Process promo cards (only return active ones)
    const bannerHomeSectionCards = config.bannerHomeSectionCards
      .filter((card: any) => card.isActive !== false) // Filter out inactive cards
      .map((card: any) => ({
        order: card.order,
        imageUrl: card.imageUrl,
        linkUrl: card.linkUrl,
      }))
      .sort((a, b) => a.order - b.order);

    return {
      bannerHomeSectionCards
    };
  }

  private async enrichBannerHomeSectionCards(section: HomeSection): Promise<any> {
    const config = section.config as any;

    if (!section.isActive || !config.bannerHomeSectionCards || !Array.isArray(config.bannerHomeSectionCards) || config.bannerHomeSectionCards.length === 0) {
      return {
        ...section,
        config: {
          ...config,
          bannerHomeSectionCards: []
        }
      };
    }

    // Process promo cards
    const bannerHomeSectionCards = config.bannerHomeSectionCards.map((card: any) => ({
      imageUrl: card.imageUrl,
      linkUrl: card.linkUrl,
      order: card.order
    })).sort((a, b) => a.order - b.order);

    return {
      ...section,
      config: {
        ...config,
        bannerHomeSectionCards
      }
    };
  }
}