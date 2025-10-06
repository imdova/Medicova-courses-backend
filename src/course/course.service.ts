import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { QueryConfig } from '../common/utils/query-options';
import { CourseTag } from './entities/course-tags.entity';
import { CoursePricing } from './course-pricing/entities/course-pricing.entity';
import { CourseSectionItem } from './course-section/entities/course-section-item.entity';
import { CourseProgress } from './course-progress/entities/course-progress.entity';
import { CourseStudent } from './entities/course-student.entity';
import { CourseCategory } from 'src/course/course-category/entities/course-category.entity';
import { CourseRating } from './entities/course-rating.entity';
import { RateCourseDto } from './dto/rate-course.dto';
import { User } from 'src/user/entities/user.entity';

export const COURSE_PAGINATION_CONFIG: QueryConfig<Course> = {
  sortableColumns: ['created_at', 'name', 'category', 'status'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    name: [FilterOperator.ILIKE], // search by course name (case-insensitive)
    'category.name': [FilterOperator.ILIKE],
    status: [FilterOperator.EQ],
    isActive: [FilterOperator.EQ],
    createdBy: [FilterOperator.EQ],
    isCourseFree: [FilterOperator.EQ],
    'pricings.salePrice': [FilterOperator.GTE, FilterOperator.LTE],
    'pricings.currencyCode': [FilterOperator.EQ],
  },
  relations: ['pricings'], // add relations if needed
};

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseTag)
    private readonly courseTagRepository: Repository<CourseTag>,
    @InjectRepository(CoursePricing)
    private readonly coursePricingRepository: Repository<CoursePricing>,
    @InjectRepository(CourseSectionItem)
    private courseSectionItemRepo: Repository<CourseSectionItem>,
    @InjectRepository(CourseCategory)
    private courseCategoryRepository: Repository<CourseCategory>,
    @InjectRepository(CourseRating)
    private courseRatingRepository: Repository<CourseRating>,
  ) { }

  // All methods are checked for performance

  async create(
    createCourseDto: CreateCourseDto,
    userId: string,
    academyId: string,
  ): Promise<Course> {
    const {
      tags,
      pricings = [],
      category: categoryId,
      subcategory: subCategoryId,
      slug,
      ...rest
    } = createCourseDto;

    const { category, subcategory } = await this.getCategoryAndSubcategory(
      categoryId,
      subCategoryId,
    );

    if (tags.length > 0) {
      // Step 1: Fetch existing tags in one query
      const existingTags = await this.courseTagRepository.find({
        where: { name: In(tags) },
      });
      const existingNames = existingTags.map((tag) => tag.name);

      // Step 2: Find new tags (case-sensitive here, adjust if needed)
      const newTagNames = tags.filter((name) => !existingNames.includes(name));

      // Step 3: Bulk insert new tags
      if (newTagNames.length > 0) {
        const newTagEntities = newTagNames.map((name) =>
          this.courseTagRepository.create({ name }),
        );
        await this.courseTagRepository.save(newTagEntities);
      }
    }

    // Step 4: Save the course with tags array
    const course = this.courseRepository.create({
      ...rest,
      createdBy: userId,
      category,
      subCategory: subcategory,
      tags,
      pricings,
      academy: { id: academyId },
      slug,
    });

    try {
      return await this.courseRepository.save(course);
    } catch (err) {
      if (err.code === '23505' && err.detail.includes('slug')) {
        throw new HttpException(
          `Slug "${slug}" already exists`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw err;
    }
  }

  async getPaginatedCourses(
    query: PaginateQuery,
    userId: string,
    academyId: string,
    role: string,
  ): Promise<Paginated<Course>> {
    const qb = this.courseRepository.createQueryBuilder('course');

    qb.leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.subCategory', 'subCategory')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('instructor.profile', 'instructorProfile')
      .loadRelationCountAndMap('course.studentCount', 'course.enrollments')
      // ✅ Count lectures via nested joins
      .loadRelationCountAndMap(
        'course.lecturesCount',
        'course.sections',
        'sectionLectures',
        (qb) =>
          qb
            .leftJoin('sectionLectures.items', 'lectureItems')
            .andWhere("lectureItems.curriculumType = :lectureType", {
              lectureType: 'lecture',
            }),
      )
      // ✅ Count quizzes via nested joins
      .loadRelationCountAndMap(
        'course.quizzesCount',
        'course.sections',
        'sectionQuizzes',
        (qb) =>
          qb
            .leftJoin('sectionQuizzes.items', 'quizItems')
            .andWhere("quizItems.curriculumType = :quizType", {
              quizType: 'quiz',
            }),
      )
      .andWhere('course.deleted_at IS NULL');

    if (role === 'academy_admin') {
      qb.andWhere('course.academy_id = :academyId', { academyId });
    } else if (role !== 'admin') {
      qb.andWhere('course.created_by = :userId', { userId });
    }

    const result = await paginate(query, qb, COURSE_PAGINATION_CONFIG);

    result.data = result.data.map(
      (course) =>
      ({
        ...course,
        instructor: this.mapInstructor(course),
      } as unknown as Course),
    );

    return result;
  }

  async findOne(
    id: string,
    userId: string,
    academyId: string,
    role: string,
  ): Promise<Course> {
    const course = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.pricings', 'pricing')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.subCategory', 'subCategory')
      .leftJoinAndSelect('course.academy', 'academy')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('instructor.profile', 'instructorProfile')
      .where('course.id = :id', { id })
      .andWhere('course.deleted_at IS NULL')
      .getOne();

    if (!course) throw new NotFoundException('Course not found');

    this.checkOwnership(course, userId, academyId, role);

    return {
      ...course,
      instructor: this.mapInstructor(course),
    } as unknown as Course;
  }

  async findOneBySlug(slug: string): Promise<Course> {
    const course = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.pricings', 'pricing')
      .leftJoinAndSelect('course.category', 'category')
      .leftJoinAndSelect('course.subCategory', 'subCategory')
      .leftJoinAndSelect('course.academy', 'academy')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('instructor.profile', 'instructorProfile')
      .leftJoinAndSelect('course.sections', 'section')
      .leftJoinAndSelect('section.items', 'item')
      .leftJoinAndSelect('item.lecture', 'lecture') // if item is a lecture
      .leftJoinAndSelect('item.quiz', 'quiz')       // if item is a quiz
      .leftJoinAndSelect('item.assignment', 'assignment') // etc
      .where('course.slug = :slug', { slug })
      .andWhere('course.deleted_at IS NULL')
      .orderBy('section.order', 'ASC')
      .addOrderBy('item.order', 'ASC')
      .getOne();

    if (!course) throw new NotFoundException('Course not found');

    // Hide lecture URLs if not free
    course.sections = course.sections?.map((section) => {
      return {
        ...section,
        items: section.items?.map((item) => {
          if (item.lecture && !item.lecture.isLectureFree) {
            return {
              ...item,
              lecture: {
                ...item.lecture,
                videoUrl: undefined,
                materialUrl: undefined,
              },
            };
          }
          return item;
        }),
      };
    });

    return {
      ...course,
      instructor: this.mapInstructor(course),
    } as unknown as Course;
  }

  async update(
    id: string,
    updateData: Partial<CreateCourseDto>,
    userId: string,
    academyId: string,
    role: string,
  ): Promise<Course> {
    const course = await this.findOne(id, userId, academyId, role);

    const {
      tags,
      pricings,
      category: categoryId,
      subcategory: subCategoryId,
      ...rest
    } = updateData;

    if (categoryId || subCategoryId) {
      const { category, subcategory } = await this.getCategoryAndSubcategory(
        categoryId ?? course.category.id, // use current category if not provided
        subCategoryId,
      );

      course.category = category;
      course.subCategory = subcategory ?? null;
    }

    // Handle tags if provided
    if (tags) {
      // 1. Find existing tags in one query
      const existingTags = await this.courseTagRepository.find({
        where: { name: In(tags) },
      });
      const existingNames = existingTags.map((tag) => tag.name);

      // 2. Identify new tags
      const newTagNames = tags.filter((name) => !existingNames.includes(name));

      // 3. Bulk insert new tags
      if (newTagNames.length > 0) {
        const newTagEntities = newTagNames.map((name) =>
          this.courseTagRepository.create({ name }),
        );
        await this.courseTagRepository.save(newTagEntities);
      }

      // 4. Update course tags array
      course.tags = tags;
    }

    // --- Handle pricings based on currencyType ---
    if (pricings) {
      const existingMap = new Map(
        course.pricings.map((p) => [p.currencyCode, p]),
      );

      for (const p of pricings) {
        const existing = existingMap.get(p.currencyCode);
        if (existing) {
          Object.assign(existing, p);
        } else {
          const newPricing = this.coursePricingRepository.create(p);
          course.pricings.push(newPricing); // attach to course
        }
      }
    }

    course.slug = updateData.slug ?? course.slug;

    // Update other fields
    Object.assign(course, rest);

    try {
      return await this.courseRepository.save(course);
    } catch (err: any) {
      if (err.code === '23505' && err.detail.includes('slug')) {
        throw new HttpException(
          `Slug "${course.slug}" already exists`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw err;
    }
  }

  async softDelete(
    id: string,
    userId: string,
    academyId: string,
    role: string,
  ): Promise<void> {
    const course = await this.findOne(id, userId, academyId, role);
    course.deleted_at = new Date();
    course.pricings.forEach((p) => (p.deleted_at = new Date()));
    await this.courseRepository.save(course);
  }

  async getAllTags(): Promise<string[]> {
    const tags = await this.courseTagRepository.find({
      order: { name: 'ASC' },
    });
    return tags.map((tag) => tag.name);
  }

  async getAllStudentsProgress(courseId: string) {
    // 1️⃣ Count total course items
    const totalItems = await this.courseSectionItemRepo.count({
      where: { section: { course: { id: courseId } } },
    });

    if (totalItems === 0) {
      throw new NotFoundException('No curriculum items found for this course');
    }

    // 2️⃣ Get student info + progress
    const students = await this.courseRepository.manager
      .getRepository(CourseStudent)
      .createQueryBuilder('cs')
      .leftJoin('cs.student', 'user')
      .leftJoin('user.profile', 'profile')
      .leftJoin(
        'course_progress',
        'progress',
        'progress.course_student_id = cs.id',
      )
      .select('user.id', 'studentId')
      .addSelect('user.email', 'studentEmail')
      .addSelect('profile.first_name', 'firstName')
      .addSelect('profile.last_name', 'lastName')
      .addSelect('profile.photo_url', 'photoUrl')
      .addSelect('profile.country', 'country')
      .addSelect('profile.state', 'state')
      .addSelect('profile.gender', 'gender')
      .addSelect('profile.date_of_birth', 'dateOfBirth')
      .addSelect('profile.category_id', 'categoryId')
      .addSelect('profile.speciality_id', 'specialtyId')
      .addSelect('cs.created_at', 'enrollmentDate')
      .addSelect(
        'COUNT(CASE WHEN progress.completed = true THEN 1 END)',
        'completedItems',
      )
      .where('cs.course = :courseId', { courseId })
      .groupBy('user.id')
      .addGroupBy('profile.id')
      .addGroupBy('cs.created_at')
      .getRawMany();

    // 3️⃣ Map results and calculate age & progress %
    return students.map((s) => {
      const completed = Number(s.completedItems) || 0;

      // Calculate age from date_of_birth
      let age: number | null = null;
      if (s.dateOfBirth) {
        const dob = new Date(s.dateOfBirth);
        const diffMs = Date.now() - dob.getTime();
        age = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
      }

      return {
        studentId: s.studentId,
        studentEmail: s.studentEmail,
        fullName: `${s.firstName} ${s.lastName}`,
        photoUrl: s.photoUrl,
        country: s.country,
        state: s.state,
        age,
        gender: s.gender,
        categoryId: s.categoryId,
        specialtyId: s.specialtyId,
        enrollmentDate: s.enrollmentDate,
        totalItems,
        completedItems: completed,
        progressPercentage: (completed / totalItems) * 100,
      };
    });
  }

  private async getCategoryAndSubcategory(
    categoryId: string,
    subCategoryId?: string,
  ): Promise<{ category: CourseCategory; subcategory?: CourseCategory }> {
    const ids = [categoryId, subCategoryId].filter(Boolean);

    const categories = await this.courseCategoryRepository.find({
      where: { id: In(ids) },
      relations: ['parent'],
    });

    const category = categories.find((c) => c.id === categoryId);
    const subcategory = categories.find((c) => c.id === subCategoryId);

    if (!category || category.parent) {
      throw new NotFoundException('Invalid main category');
    }

    if (subCategoryId) {
      if (!subcategory || subcategory.parent?.id !== category.id) {
        throw new NotFoundException('Invalid subcategory for given category');
      }
    }

    return { category, subcategory };
  }

  async rateCourse(courseId: string, userId: string, dto: RateCourseDto) {
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    // Upsert rating (insert if new, update if exists)
    await this.courseRatingRepository.upsert(
      {
        course: { id: courseId },
        user: { id: userId },
        rating: dto.rating,
        review: dto.review,
      },
      ['course', 'user'],
    );

    // Recalculate aggregate
    await this.updateCourseAggregates(courseId);

    return { message: 'Rating submitted successfully' };
  }

  private async updateCourseAggregates(courseId: string) {
    const { avg, count } = await this.courseRatingRepository
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.course_id = :courseId', { courseId })
      .getRawOne();

    await this.courseRepository.update(courseId, {
      averageRating: Number(avg) || 0,
      ratingCount: Number(count) || 0,
    });
  }

  private checkOwnership(
    course: Course,
    userId: string,
    academyId: string,
    role: string,
  ) {
    if (role === 'admin') return; // full access
    if (role === 'academy_admin') {
      if (course.academy?.id !== academyId) {
        throw new ForbiddenException(
          'You cannot access courses outside your academy',
        );
      }
    } else {
      // instructor / academy_user
      if (course.createdBy !== userId) {
        throw new ForbiddenException(
          'You are not allowed to access this course',
        );
      }
    }
  }

  private mapInstructor(rawCourse: Course & { instructor?: User }) {
    const instructor = rawCourse['instructor'];
    if (!instructor) return null;

    const profile = instructor.profile;
    return {
      id: instructor.id,
      fullName: profile ? `${profile.firstName} ${profile.lastName}` : null,
      userName: profile?.userName,
      photoUrl: profile?.photoUrl,
    };
  }

  async getCourseRatings(courseId: string) {
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['ratings', 'ratings.user', 'ratings.user.profile'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const reviews = course.ratings.map((r) => ({
      id: r.id,
      rating: r.rating,
      review: r.review,
      user: {
        id: r.user.id,
        name: r.user.profile
          ? `${r.user.profile.firstName} ${r.user.profile.lastName}`
          : r.user.email, // fallback if profile missing
        image: r.user.profile?.photoUrl || null,
      },
      createdAt: r.created_at, // use camelCase if entity uses it
    }));

    return {
      totalCount: reviews.length,
      reviews,
    };
  }
}
