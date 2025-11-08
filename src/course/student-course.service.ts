import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { QueryConfig } from '../common/utils/query-options';
import { Profile } from 'src/profile/entities/profile.entity';
import { CurrencyCode } from './course-pricing/entities/course-pricing.entity';
import { CourseStudent } from './entities/course-student.entity';
import { User } from 'src/user/entities/user.entity';
import { CourseProgress } from './course-progress/entities/course-progress.entity';
import { CourseSectionItem } from './course-section/entities/course-section-item.entity';
import { CourseFavorite } from './entities/course-favorite.entity';
import { CourseCommunity } from './course-community/entities/course-community.entity';
import { AcademyInstructor } from 'src/academy/entities/academy-instructors.entity';
import { CourseService } from './course.service';

export const COURSE_PAGINATION_CONFIG: QueryConfig<Course> = {
  sortableColumns: ['created_at', 'name', 'category', 'status', 'averageRating'],
  defaultSortBy: [], // Remove default sorting to allow custom sorting
  filterableColumns: {
    name: [FilterOperator.ILIKE],
    category: [FilterOperator.EQ],
    status: [FilterOperator.EQ],
    isActive: [FilterOperator.EQ],
    createdBy: [FilterOperator.EQ],
    type: [FilterOperator.EQ],
    level: [FilterOperator.EQ],
    averageRating: [FilterOperator.GTE],
    isCourseFree: [FilterOperator.EQ],
  },
  searchableColumns: [
    'name',
    'tags',
    'metadata'
  ],
  relations: [],
};

@Injectable()
export class StudentCourseService {
  constructor(
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(CourseStudent)
    private readonly courseStudentRepository: Repository<CourseStudent>,
    @InjectRepository(CourseProgress)
    private readonly progressRepo: Repository<CourseProgress>,
    @InjectRepository(CourseSectionItem)
    private readonly courseSectionItemRepo: Repository<CourseSectionItem>,
    @InjectRepository(CourseFavorite)
    private readonly courseFavoriteRepository: Repository<CourseFavorite>,
    @InjectRepository(AcademyInstructor)
    private readonly academyInstructorRepository: Repository<AcademyInstructor>,
    private readonly courseService: CourseService,
    private readonly dataSource: DataSource
  ) { }

  // private async getCurrencyForUser(
  //   userId: string,
  // ): Promise<CurrencyCode | null> {
  //   // 1. Fetch the profile
  //   const profile = await this.profileRepo.findOne({
  //     where: { user: { id: userId } },
  //     // Ensure you load the country object/relation if necessary
  //   });

  //   // 2. Validate country data
  //   if (!profile || !profile.country || !profile.country.code) {
  //     // Fallback: If country data is missing, still return the global default (USD) 
  //     // or return null if strict policy requires a country. We'll return USD for robustness.
  //     return CurrencyCode.USD;
  //   }

  //   const countryCode = profile.country.code.toUpperCase(); // e.g., "EG", "SA", "US"

  //   // 3. Dynamically attempt to map Country Code to Currency Code
  //   const availableCurrencies: string[] = Object.values(CurrencyCode);

  //   // Attempt to find a currency code that starts with the country code.
  //   // Examples: EG + P = EGP; SA + R = SAR
  //   const matchingCurrency = availableCurrencies.find(currency =>
  //     currency.startsWith(countryCode)
  //   );

  //   if (matchingCurrency) {
  //     // Found a dynamic match (e.g., EGP, SAR)
  //     return matchingCurrency as CurrencyCode;
  //   }

  //   // --- Handling Common Exceptions (Manual Override) ---
  //   // This section is vital because many currencies do NOT follow the pattern (e.g., CA -> CAD, AU -> AUD).
  //   switch (countryCode) {
  //     case 'US': // United States -> USD
  //     case 'CA': // Canada -> CAD (The pattern check likely failed because CAD doesn't start with CA)
  //     case 'AU': // Australia -> AUD
  //       return CurrencyCode.USD; // Or handle CAD, AUD if they are required to be separate.
  //     // Sticking with USD as the fallback/global default.
  //   }
  //   // ----------------------------------------------------

  //   // 4. Fallback Default
  //   return CurrencyCode.USD;
  // }

  async getPaginatedCourses(
    query: PaginateQuery,
    user: any,
    customFilters: any
  ): Promise<any> {
    // --- 1. Quick Query Processing ---
    const processedQuery: PaginateQuery = {
      ...query,
      path: query.path
    };

    // Fast processing of sortBy
    if (query.sortBy && Array.isArray(query.sortBy)) {
      processedQuery.sortBy = query.sortBy.filter((sort): sort is [string, string] =>
        Array.isArray(sort) && sort.length === 2
      ).map(([fieldPart, direction]) => {
        if (typeof fieldPart === 'string' && fieldPart.startsWith('sortBy=')) {
          return [fieldPart.replace('sortBy=', ''), direction];
        }
        return [fieldPart, direction];
      });
    }

    // --- 2. Efficient Filter Extraction ---
    const categories: string[] = !customFilters.categories ? [] :
      Array.isArray(customFilters.categories) ?
        customFilters.categories.filter(Boolean) :
        customFilters.categories.split(',').filter(Boolean);

    const subcategories: string[] = !customFilters.subcategories ? [] :
      Array.isArray(customFilters.subcategories) ?
        customFilters.subcategories.filter(Boolean) :
        customFilters.subcategories.split(',').filter(Boolean);

    const languages: string[] = !customFilters.languages ? [] :
      Array.isArray(customFilters.languages) ?
        customFilters.languages.filter(Boolean) :
        customFilters.languages.split(',').filter(Boolean);

    const durations: string[] = !customFilters.durations ? [] :
      Array.isArray(customFilters.durations) ?
        customFilters.durations.filter(Boolean) :
        customFilters.durations.split(',').filter(Boolean);

    const priceFrom = customFilters.priceFrom ? parseFloat(customFilters.priceFrom) : undefined;
    const priceTo = customFilters.priceTo ? parseFloat(customFilters.priceTo) : undefined;

    // --- 3. Check for Price Sorting ---
    const priceSortIndex = processedQuery.sortBy?.findIndex(([column]) => column === 'effectivePrice');
    const hasPriceSorting = priceSortIndex !== -1;

    // --- 4. Build Optimized Query Builder ---
    const qb = this.courseRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.pricings', 'pricing', 'pricing.isActive = true')
      .leftJoin('course.academy', 'academy')
      .addSelect([
        'academy.id',
        'academy.name',
        'academy.slug',
        'academy.description',
        'academy.image',
        'academy.about',
      ])
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('instructor.profile', 'instructorProfile')
      .leftJoin('course.category', 'category')
      .leftJoin('course.subCategory', 'subCategory')
      .where('course.deleted_at IS NULL')
      .andWhere('course.status = :status', { status: 'published' }) // Add this
      .andWhere('course.isActive = :isActive', { isActive: true }) // Add this

      // Optimized count loading
      .loadRelationCountAndMap('course.studentCount', 'course.enrollments')
      .loadRelationCountAndMap(
        'course.lecturesCount',
        'course.sections',
        'sectionLectures',
        (qb) => qb.leftJoin('sectionLectures.items', 'lectureItems')
          .andWhere('lectureItems.curriculumType = :lectureType', { lectureType: 'lecture' })
      )
      .loadRelationCountAndMap(
        'course.quizzesCount',
        'course.sections',
        'sectionQuizzes',
        (qb) => qb.leftJoin('sectionQuizzes.items', 'quizItems')
          .andWhere('quizItems.curriculumType = :quizType', { quizType: 'quiz' })
      );

    // --- 5. Handle Price Sorting with Single Query ---
    if (hasPriceSorting && processedQuery.sortBy && processedQuery.sortBy[priceSortIndex]) {
      const priceSortOrder = processedQuery.sortBy[priceSortIndex][1];

      if (priceSortOrder) {
        // Single query approach - no subquery execution
        qb.addSelect(`
      (
        SELECT MIN(COALESCE(p2."salePrice", p2."regularPrice")) 
        FROM course_pricing p2 
        WHERE p2."course_id" = course.id AND p2."isActive" = true
      )
    `, 'course_min_effective_price')
          .orderBy('course_min_effective_price', priceSortOrder === 'ASC' ? 'ASC' : 'DESC');

        // Remove price sorting from query to avoid conflicts
        const updatedSortBy = [...processedQuery.sortBy];
        updatedSortBy.splice(priceSortIndex, 1);
        processedQuery.sortBy = updatedSortBy.length > 0 ? updatedSortBy : undefined;
      }
    }

    // --- 6. Apply Filters Efficiently ---
    if (categories.length > 0) {
      qb.andWhere('category.name IN (:...catNames)', { catNames: categories });
    }

    if (subcategories.length > 0) {
      qb.andWhere('subCategory.name IN (:...subCatNames)', { subCatNames: subcategories });
    }

    if (languages.length > 0) {
      qb.andWhere('course.languages && ARRAY[:...languagesArray]', { languagesArray: languages });
    }

    // --- NEW: Apply Duration Filters ---
    if (durations.length > 0) {
      const durationConditions = durations.map(duration => {
        switch (duration) {
          case 'less2Hours':
            return '(course.course_duration_unit = \'hours\' AND course.course_duration < 2)';
          case '2_10Hours':
            return '(course.course_duration_unit = \'hours\' AND course.course_duration BETWEEN 2 AND 10)';
          case '1_4Weeks':
            return '(course.course_duration_unit = \'weeks\' AND course.course_duration BETWEEN 1 AND 4)';
          case '1_3Months':
            // Use < 3 instead of BETWEEN 1 AND 3 to avoid overlap
            return '((course.course_duration_unit = \'weeks\' AND course.course_duration BETWEEN 5 AND 12) OR (course.course_duration_unit = \'months\' AND course.course_duration >= 1 AND course.course_duration < 3))';
          case '3_6Months':
            // Use >= 3 instead of BETWEEN 3 AND 6 to avoid overlap
            return '(course.course_duration_unit = \'months\' AND course.course_duration >= 3 AND course.course_duration <= 6)';
          case 'more6Months':
            return '(course.course_duration_unit = \'months\' AND course.course_duration > 6)';
          default:
            return null;
        }
      }).filter(condition => condition !== null);

      if (durationConditions.length > 0) {
        qb.andWhere(`(${durationConditions.join(' OR ')})`);
      }
    }

    if (priceFrom !== undefined || priceTo !== undefined) {
      const priceCondition = `
      EXISTS (
        SELECT 1 FROM course_pricing cp 
        WHERE cp."course_id" = course.id 
        AND cp."isActive" = true 
        AND COALESCE(cp."salePrice", cp."regularPrice") BETWEEN :priceFrom AND :priceTo
      )
    `;
      qb.andWhere(priceCondition, {
        priceFrom: priceFrom || 0,
        priceTo: priceTo || Number.MAX_SAFE_INTEGER
      });
    }

    // --- 7. Apply Custom Search for Metadata and Tags ---
    if (processedQuery.search) {
      const searchTerm = processedQuery.search.trim();
      if (searchTerm) {
        // For tags array search
        const tagsSearchCondition = `
        EXISTS (
          SELECT 1 FROM unnest(course.tags) AS tag
          WHERE tag ILIKE :searchTermWildcard
        )
      `;

        // For metadata.courseOverview JSONB search
        const metadataSearchCondition = `
        course.metadata->>'courseOverview' ILIKE :searchTermWildcard
      `;

        // Combine with existing name search from pagination
        qb.andWhere(`(
        course.name ILIKE :searchTermWildcard OR
        ${tagsSearchCondition} OR
        ${metadataSearchCondition}
      )`, {
          searchTermWildcard: `%${searchTerm}%`
        });
      }
    }

    // --- 8. Run Optimized Pagination ---
    const result = await paginate(processedQuery, qb, COURSE_PAGINATION_CONFIG) as any;

    // --- 9. Efficient Post-Processing (Inline) ---
    const courses = result.data as Course[];

    // Extract unique instructor IDs
    const instructorIds: string[] = [...new Set(
      courses.map(course => course.createdBy).filter((id): id is string => !!id)
    )];

    // Bulk fetch instructor data
    const [academyInstructorsMap, instructorStatsMap] = await Promise.all([
      this.courseService.getAcademyInstructorsBulk(courses),
      this.courseService.getInstructorStatsBulk(instructorIds),
    ]);

    // Map the final result
    result.data = courses.map((course: Course) => {
      const mappedInstructor = this.mapInstructor(course);
      const instructorStats = instructorStatsMap.get(course.createdBy);

      return {
        ...course,
        instructor: mappedInstructor ? {
          ...mappedInstructor,
          coursesCount: instructorStats?.coursesCount || 0,
          studentsCount: instructorStats?.studentsCount || 0,
          averageRating: instructorStats?.averageRating || 0,
          reviewsCount: instructorStats?.reviewsCount || 0,
        } : null,
        academyInstructors: academyInstructorsMap.get(course.id) || [],
      };
    });

    return result;
  }

  async findOne(id: string, user: any): Promise<Course> {
    //const currency = await this.getCurrencyForUser(user.sub);

    // 1. Check Enrollment
    const enrollment = await this.courseStudentRepository.findOne({
      where: { course: { id }, student: { id: user.sub } },
    });

    let course: Course | null;

    if (enrollment) {
      // ✅ Enrolled users get full course details
      const qb = this.courseRepo
        .createQueryBuilder('course')
        // ... (All extensive joins remain the same for enrolled users)
        .leftJoinAndSelect('course.pricings', 'pricing')
        .leftJoinAndSelect('course.sections', 'section')
        .leftJoinAndSelect('section.items', 'item')
        .leftJoinAndSelect('item.lecture', 'lecture')
        .leftJoinAndSelect('item.quiz', 'quiz')
        .leftJoinAndSelect('quiz.quizQuestions', 'quizQuestion')
        .leftJoinAndSelect('quizQuestion.question', 'question')
        .leftJoinAndSelect('item.assignment', 'assignment')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoinAndSelect('instructor.profile', 'instructorProfile')
        .leftJoinAndSelect('course.category', 'category')
        .leftJoinAndSelect('course.subCategory', 'subCategory')
        .where('course.id = :id', { id })
        .andWhere('course.deleted_at IS NULL')
        .orderBy('section.order', 'ASC')
        .addOrderBy('item.order', 'ASC')
        .addOrderBy('quizQuestion.order', 'ASC')
        // ... (Counts logic remains the same)
        .loadRelationCountAndMap('course.studentCount', 'course.enrollments')
        .loadRelationCountAndMap(
          'course.lecturesCount',
          'course.sections',
          'sectionLectures',
          (qb) =>
            qb
              .leftJoin('sectionLectures.items', 'lectureItems')
              .andWhere('lectureItems.curriculumType = :lectureType', {
                lectureType: 'lecture',
              }),
        )
        .loadRelationCountAndMap(
          'course.quizzesCount',
          'course.sections',
          'sectionQuizzes',
          (qb) =>
            qb
              .leftJoin('sectionQuizzes.items', 'quizItems')
              .andWhere('quizItems.curriculumType = :quizType', {
                quizType: 'quiz',
              }),
        );

      course = await qb.getOne();

      if (course) this.randomizeCourseQuizzes(course);
    } else {
      // ✅ Not enrolled → lightweight fetch
      const qb = this.courseRepo
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.pricings', 'pricing')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoin('course.academy', 'academy')
        .addSelect([
          'academy.id',
          'academy.name',
          'academy.slug',
          'academy.description',
          'academy.image',
          'academy.about',
        ])
        .leftJoinAndSelect('instructor.profile', 'instructorProfile')
        .leftJoinAndSelect('course.category', 'category')
        .leftJoinAndSelect('course.subCategory', 'subCategory')
        .where('course.id = :id', { id })
        .andWhere('course.deleted_at IS NULL')
        // ... (Counts logic remains the same)
        .loadRelationCountAndMap('course.studentCount', 'course.enrollments')
        .loadRelationCountAndMap(
          'course.lecturesCount',
          'course.sections',
          'sectionLectures',
          (qb) =>
            qb
              .leftJoin('sectionLectures.items', 'lectureItems')
              .andWhere('lectureItems.curriculumType = :lectureType', {
                lectureType: 'lecture',
              }),
        )
        .loadRelationCountAndMap(
          'course.quizzesCount',
          'course.sections',
          'sectionQuizzes',
          (qb) =>
            qb
              .leftJoin('sectionQuizzes.items', 'quizItems')
              .andWhere('quizItems.curriculumType = :quizType', {
                quizType: 'quiz',
              }),
        );

      course = await qb.getOne();
    }

    if (!course) throw new NotFoundException('Course not found');

    // ✅ Filter pricing by user's currency
    // if (currency) {
    //   course.pricings = course.pricings.filter(
    //     (p) => p.currencyCode === currency,
    //   );
    // }

    // 🎯 OPTIMIZATION: Fetch academy instructors and instructor stats in parallel
    const [academyInstructors, instructorStatsMap] = await Promise.all([
      this.courseService.getAcademyInstructorsForCourse(course),
      this.courseService.getInstructorStatsBulk([course.createdBy]),
    ]);

    // ✅ NEW: Fetch related courses (your existing smart logic remains)
    const relatedQuery = this.courseRepo
      .createQueryBuilder('related')
      // ... (Related course logic remains the same)
      .leftJoin('related.enrollments', 'enrollments')
      .where('related.id != :id', { id: course.id })
      .andWhere('related.deleted_at IS NULL')
      .andWhere(
        new Brackets((qb) => {
          if (course.subCategory?.id) {
            qb.orWhere('related.subcategory_id = :subCategoryId', {
              subCategoryId: course.subCategory.id,
            });
          }
          if (course.category?.id) {
            qb.orWhere('related.category_id = :categoryId', {
              categoryId: course.category.id,
            });
          }
          if (course.tags?.length) {
            qb.orWhere('related.tags && :tags', { tags: course.tags });
          }
          if (course.name) {
            const firstWord = course.name.toLowerCase().split(' ')[0];
            qb.orWhere('LOWER(related.name) LIKE :name', {
              name: `%${firstWord}%`,
            });
          }
        }),
      );

    const relatedCoursesRaw = await relatedQuery
      .select([
        'related.id AS id',
        'related.name AS name',
        'related.course_image AS "courseImage"',
        'COUNT(enrollments.id) AS "studentCount"',
        // ✅ NEW: Check if course is favorited by current user
        `(${user.sub ? `SELECT COUNT(cf.id) > 0 FROM course_favorite cf WHERE cf.course_id = related.id AND cf.student_id = '${user.sub}'` : 'false'}) AS "isFavorite"`,
      ])
      .groupBy('related.id')
      .addGroupBy('related.name')
      .addGroupBy('related.course_image')
      .orderBy('"studentCount"', 'DESC')
      .limit(8)
      .getRawMany();

    // ✅ Convert count strings → numbers
    const relatedCourses = relatedCoursesRaw.map((r) => ({
      id: r.id,
      name: r.name,
      courseImage: r.courseImage,
      studentCount: Number(r.studentCount) || 0,
      isFavorite: r.isFavorite === true || r.isFavorite === 't' || r.isFavorite === '1',
    }));

    // 4. Map instructor data into a compact format and add all fetched data
    const instructorStats = instructorStatsMap.get(course.createdBy);
    const mappedInstructor = this.mapInstructor(course);

    return {
      ...course,
      instructor: mappedInstructor ? {
        ...mappedInstructor,
        // Inject the bulk-fetched stats
        coursesCount: instructorStats?.coursesCount || 0,
        studentsCount: instructorStats?.studentsCount || 0,
        averageRating: instructorStats?.averageRating || 0,
        reviewsCount: instructorStats?.reviewsCount || 0,
      } : null,
      academyInstructors,
      // Assuming you want to return related courses, add them here
      relatedCourses,
    } as unknown as Course;
  }

  async enroll(courseId: string, userId: string): Promise<CourseStudent> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId, deleted_at: null },
    });
    if (!course) throw new NotFoundException('Course not found');

    // Check if already enrolled
    const existing = await this.courseStudentRepository.findOne({
      where: { course: { id: courseId }, student: { id: userId } },
    });
    if (existing) {
      throw new BadRequestException('Already enrolled in this course');
    }

    const enrollment = this.courseStudentRepository.create({
      course,
      student: { id: userId } as any, // only need reference
    });

    return this.courseStudentRepository.save(enrollment);
  }

  async getEnrolledCourses(query: PaginateQuery, userId: string) {
    //const currency = await this.getCurrencyForUser(userId);

    const qb = this.courseRepo
      .createQueryBuilder('course')
      .innerJoin('course.enrollments', 'enrollment')
      .innerJoin('enrollment.student', 'student', 'student.id = :userId', {
        userId,
      })
      .leftJoinAndSelect('course.pricings', 'pricing')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoin('course.academy', 'academy')
      .addSelect([
        'academy.id',
        'academy.name',
        'academy.slug',
        'academy.description',
        'academy.image',
        'academy.about',
      ])
      .leftJoinAndSelect('instructor.profile', 'instructorProfile')
      .andWhere('course.deleted_at IS NULL')

      // ✅ Count total enrolled students per course
      .loadRelationCountAndMap('course.studentCount', 'course.enrollments')

      // ✅ Count lectures
      .loadRelationCountAndMap(
        'course.lecturesCount',
        'course.sections',
        'sectionLectures',
        (qb) =>
          qb
            .leftJoin('sectionLectures.items', 'lectureItems')
            .andWhere('lectureItems.curriculumType = :lectureType', {
              lectureType: 'lecture',
            }),
      )

      // ✅ Count quizzes
      .loadRelationCountAndMap(
        'course.quizzesCount',
        'course.sections',
        'sectionQuizzes',
        (qb) =>
          qb
            .leftJoin('sectionQuizzes.items', 'quizItems')
            .andWhere('quizItems.curriculumType = :quizType', {
              quizType: 'quiz',
            }),
      );

    const result = await paginate(query, qb, COURSE_PAGINATION_CONFIG);

    // ✅ Filter pricing by user's currency (existing logic)
    // if (currency) {
    //   result.data.forEach((course: any) => {
    //     course.pricings = course.pricings.filter(
    //       (p) => p.currencyCode === currency,
    //     );
    //   });
    // }

    // --- Start Bulk Fetching Operations ---

    // 1. Extract all unique instructor IDs from the results
    const instructorIds = [
      ...new Set(
        result.data
          .map((course: any) => course.createdBy)
          .filter((id): id is string => !!id),
      ),
    ];

    // 2. Prepare course IDs for progress fetching
    const courseIds = result.data.map((course: any) => course.id);

    // 3. Execute ALL bulk fetches (Progress, Academy Instructors, Instructor Stats) in parallel
    const [progressMap, academyInstructorsMap, instructorStatsMap] = await Promise.all([
      this.getBulkCourseProgress(courseIds, userId), // Existing progress bulk fetch
      this.courseService.getAcademyInstructorsBulk(result.data as Course[]),
      this.courseService.getInstructorStatsBulk(instructorIds), // 🎯 NEW: Bulk fetch instructor stats
    ]);

    // --- Start Data Mapping and Merging ---

    result.data = result.data.map((course) => {
      // Get instructor data and bulk stats
      const mappedInstructor = this.mapInstructor(course);
      const instructorStats = instructorStatsMap.get(course.createdBy); // 🎯 NEW: Get stats by ID

      return {
        ...(course as any),
        // Add progress percentage (existing logic)
        progressPercentage: progressMap.get(course.id) || 0,

        // Map instructor data with merged stats
        instructor: mappedInstructor ? {
          ...mappedInstructor,
          coursesCount: instructorStats?.coursesCount || 0,
          studentsCount: instructorStats?.studentsCount || 0,
          averageRating: instructorStats?.averageRating || 0,
          reviewsCount: instructorStats?.reviewsCount || 0,
        } : null,
        academyInstructors: academyInstructorsMap.get(course.id) || [],
      };
    });

    return result;
  }

  async drop(courseId: string, userId: string): Promise<void> {
    const enrollment = await this.courseStudentRepository.findOne({
      where: { course: { id: courseId }, student: { id: userId } },
      relations: ['course', 'student'],
    });

    if (!enrollment) {
      throw new NotFoundException('You are not enrolled in this course');
    }

    await this.courseStudentRepository.remove(enrollment);
  }

  /** 🔹 Randomizes quiz questions and answers for a course */
  private randomizeCourseQuizzes(course: Course) {
    course.sections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.quiz?.quizQuestions?.length) {
          let questions = item.quiz.quizQuestions.map((qq) => qq.question);

          if (item.quiz.randomize_questions) {
            questions = this.shuffleArray(questions);
          }

          if (item.quiz.randomize_answers) {
            questions = questions.map((q) => ({
              ...q,
              answers: q.answers ? this.shuffleArray([...q.answers]) : [],
            }));
          }

          item.quiz.quizQuestions = questions.map(
            (q) => ({ question: q } as any),
          );
        }
      });
    });
  }

  /** 🔹 Utility to shuffle an array */
  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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

  async getLatestStudiedCourse(studentId: string) {
    const progressRepo = this.dataSource.getRepository(CourseProgress);
    const courseRepo = this.dataSource.getRepository(Course);
    const itemRepo = this.dataSource.getRepository(CourseSectionItem);

    // 1️⃣ Get the latest progress record (light join with item + section)
    const latestProgress = await progressRepo
      .createQueryBuilder('progress')
      .innerJoinAndSelect('progress.courseStudent', 'courseStudent')
      .innerJoinAndSelect('courseStudent.course', 'course')
      .leftJoinAndSelect('progress.item', 'item')
      .leftJoinAndSelect('item.section', 'section')
      .where('courseStudent.student_id = :studentId', { studentId })
      .orderBy('progress.updated_at', 'DESC')
      .addOrderBy('progress.created_at', 'DESC')
      .getOne();

    if (!latestProgress) {
      return null;
    }

    // 2️⃣ Fetch course and calculate progress in parallel
    const [course, totalItems, completedItems] = await Promise.all([
      courseRepo.findOne({
        where: { id: latestProgress.courseStudent.course.id },
      }),
      itemRepo.count({
        where: { section: { course: { id: latestProgress.courseStudent.course.id } } },
      }),
      progressRepo
        .createQueryBuilder('progress')
        .innerJoin('progress.courseStudent', 'courseStudent')
        .where('courseStudent.student_id = :studentId', { studentId })
        .andWhere('courseStudent.course_id = :courseId', {
          courseId: latestProgress.courseStudent.course.id,
        })
        .andWhere('progress.completed = true')
        .getCount(),
    ]);

    if (!course) return null;

    const totalProgress =
      totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // 3️⃣ Extract latest item info (no heavy joins)
    const latestItem = latestProgress.item
      ? {
        id: latestProgress.item.id,
        type: latestProgress.item.curriculumType || null,
        sectionName: latestProgress.item.section?.name || null,
        lastStudiedAt: latestProgress.updated_at,
      }
      : null;

    // 4️⃣ Return combined response
    return {
      course,
      totalProgress,
      latestItem,
    };
  }

  async getRelatedCoursesForEnrolled(userId: string) {
    // 1️⃣ Fetch minimal enrollment data (only needed fields)
    const enrolledCourses = await this.courseRepo
      .createQueryBuilder('course')
      .select([
        'course.id AS id',
        'course.name AS name',
        'course.tags AS tags',
        'category.id AS categoryId',
        'subCategory.id AS subCategoryId',
      ])
      .innerJoin('course.enrollments', 'enrollment')
      .innerJoin('enrollment.student', 'student', 'student.id = :userId', { userId })
      .leftJoin('course.category', 'category')
      .leftJoin('course.subCategory', 'subCategory')
      .andWhere('course.deleted_at IS NULL')
      .getRawMany();

    if (!enrolledCourses.length) {
      return [];
    }

    // 2️⃣ Collect filters efficiently
    const categoryIds = enrolledCourses
      .map((c) => c.categoryId)
      .filter(Boolean);

    const subCategoryIds = enrolledCourses
      .map((c) => c.subCategoryId)
      .filter(Boolean);

    const allTags = new Set<string>();
    const keywords = new Set<string>();

    for (const c of enrolledCourses) {
      try {
        const tags = Array.isArray(c.tags)
          ? c.tags
          : typeof c.tags === 'string'
            ? JSON.parse(c.tags)
            : [];
        tags.forEach((t) => allTags.add(t));
      } catch {
        /* ignore malformed tags */
      }

      if (c.name) {
        const firstWord = c.name.toLowerCase().split(' ')[0];
        if (firstWord.length > 2) keywords.add(firstWord);
      }
    }

    const enrolledCourseIds = enrolledCourses.map((c) => c.id);

    // 3️⃣ Build optimized related query
    const relatedQuery = this.courseRepo
      .createQueryBuilder('related')
      .where('related.deleted_at IS NULL')
      .andWhere('related.id NOT IN (:...enrolledCourseIds)', { enrolledCourseIds })
      .andWhere(
        new Brackets((qb) => {
          if (subCategoryIds.length)
            qb.orWhere('related.subcategory_id IN (:...subCategoryIds)', {
              subCategoryIds,
            });
          if (categoryIds.length)
            qb.orWhere('related.category_id IN (:...categoryIds)', {
              categoryIds,
            });
          if (allTags.size)
            qb.orWhere('related.tags && :tags', { tags: Array.from(allTags) });
          if (keywords.size)
            qb.orWhere(
              new Brackets((keywordQB) => {
                Array.from(keywords).forEach((word) => {
                  keywordQB.orWhere('LOWER(related.name) LIKE :kw_' + word, {
                    ['kw_' + word]: `%${word}%`,
                  });
                });
              }),
            );
        }),
      )
      .select([
        'related.id AS id',
        'related.name AS name',
        'related.course_image AS "courseImage"',
        // ✅ Use subquery for accurate and efficient student count
        `(SELECT COUNT(cs.id) FROM course_student cs WHERE cs.course_id = related.id) AS "studentCount"`,
        // ✅ NEW: Check if course is favorited by current user
        `(SELECT COUNT(cf.id) > 0 FROM course_favorite cf WHERE cf.course_id = related.id AND cf.student_id = '${userId}') AS "isFavorite"`,
      ])
      .orderBy('"studentCount"', 'DESC')
      .limit(12);

    // 4️⃣ Execute and format
    const relatedCoursesRaw = await relatedQuery.getRawMany();

    const relatedCourses = relatedCoursesRaw.map((r) => ({
      id: r.id,
      name: r.name,
      courseImage: r.courseImage,
      studentCount: Number(r.studentCount) || 0,
      isFavorite: r.isFavorite === true || r.isFavorite === 't' || r.isFavorite === '1', // Handle different boolean representations
    }));

    return relatedCourses;
  }

  async getBulkCourseProgress(
    courseIds: string[],
    studentId: string,
  ): Promise<Map<string, number>> {
    if (courseIds.length === 0) {
      return new Map();
    }

    // 1️⃣ Get all enrollments for these courses
    const enrollments = await this.courseStudentRepository.find({
      where: {
        course: { id: In(courseIds) },
        student: { id: studentId },
      },
      select: ['id', 'course'],
      relations: ['course'],
    });

    const enrollmentMap = new Map(
      enrollments.map((e) => [e.course.id, e.id]),
    );

    // 2️⃣ Get total items per course (single query)
    const totalItemsQuery = await this.courseSectionItemRepo
      .createQueryBuilder('item')
      .select('course.id', 'courseId')
      .addSelect('COUNT(item.id)', 'totalCount')
      .leftJoin('item.section', 'section')
      .leftJoin('section.course', 'course')
      .where('course.id IN (:...courseIds)', { courseIds })
      .groupBy('course.id')
      .getRawMany();

    const totalItemsMap = new Map(
      totalItemsQuery.map((row) => [row.courseId, parseInt(row.totalCount)]),
    );

    // 3️⃣ Get completed items per course (single query)
    const completedItemsQuery = await this.progressRepo
      .createQueryBuilder('progress')
      .select('course.id', 'courseId')
      .addSelect('COUNT(progress.id)', 'completedCount')
      .leftJoin('progress.item', 'item')
      .leftJoin('item.section', 'section')
      .leftJoin('section.course', 'course')
      .where('progress.course_student_id IN (:...enrollmentIds)', {
        enrollmentIds: Array.from(enrollmentMap.values()),
      })
      .andWhere('progress.completed = :completed', { completed: true })
      .andWhere('course.id IN (:...courseIds)', { courseIds })
      .groupBy('course.id')
      .getRawMany();

    const completedItemsMap = new Map(
      completedItemsQuery.map((row) => [
        row.courseId,
        parseInt(row.completedCount),
      ]),
    );

    // 4️⃣ Calculate percentages
    const progressMap = new Map<string, number>();

    courseIds.forEach((courseId) => {
      const isEnrolled = enrollmentMap.has(courseId);
      const totalCount = totalItemsMap.get(courseId) || 0;
      const completedCount = completedItemsMap.get(courseId) || 0;

      if (!isEnrolled || totalCount === 0) {
        progressMap.set(courseId, 0);
      } else {
        progressMap.set(courseId, (completedCount / totalCount) * 100);
      }
    });

    return progressMap;
  }

  async toggleFavorite(courseId: string, userId: string) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId, deleted_at: null },
    });
    if (!course) throw new NotFoundException('Course not found');

    const existing = await this.courseFavoriteRepository.findOne({
      where: { course: { id: courseId }, student: { id: userId } },
    });

    if (existing) {
      await this.courseFavoriteRepository.remove(existing);
      return { message: 'Removed from favorites' };
    }

    const favorite = this.courseFavoriteRepository.create({
      course,
      student: { id: userId } as any,
    });
    await this.courseFavoriteRepository.save(favorite);

    return { message: 'Added to favorites' };
  }

  async getFavoriteCourses(userId: string) {
    //const currency = await this.getCurrencyForUser(userId);

    const qb = this.courseRepo
      .createQueryBuilder('course')
      .innerJoin('course_favorite', 'favorite', 'favorite.course_id = course.id')
      .where('favorite.student_id = :userId', { userId })
      .leftJoinAndSelect('course.pricings', 'pricing')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('instructor.profile', 'instructorProfile')
      .andWhere('course.deleted_at IS NULL')
      .loadRelationCountAndMap('course.studentCount', 'course.enrollments');

    const favorites = await qb.getMany();

    // Filter pricings
    // if (currency) {
    //   favorites.forEach((course: any) => {
    //     course.pricings = course.pricings.filter(
    //       (p) => p.currencyCode === currency,
    //     );
    //   });
    // }

    // Simplify instructor
    favorites.forEach((course: any) => {
      course.instructor = this.mapInstructor(course);
    });

    return favorites;
  }

  async getStudentActivity(studentId: string): Promise<any> {
    // 1️⃣ Get student with profile
    const student = await this.dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.id = :studentId', { studentId })
      .select([
        'user.id',
        'user.email',
        'profile.firstName',
        'profile.lastName',
        'profile.photoUrl',
        'profile.phoneNumber',
        'profile.city',
      ])
      .getOne();

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 2️⃣ Get course progress statistics for this student
    const progressStats = await this.dataSource.query(
      `
    WITH course_items AS (
      SELECT 
        cs.student_id,
        cs.course_id,
        COUNT(DISTINCT csi.id) as total_items
      FROM course_student cs
      INNER JOIN course_sections csec ON csec.course_id = cs.course_id
      INNER JOIN course_section_items csi ON csi.section_id = csec.id
      WHERE cs.student_id = $1
      GROUP BY cs.student_id, cs.course_id
    ),
    completed_items AS (
      SELECT 
        cs.student_id,
        cs.course_id,
        COUNT(DISTINCT cp.item_id) as completed_count
      FROM course_student cs
      INNER JOIN course_progress cp ON cp.course_student_id = cs.id
      WHERE cs.student_id = $1 AND cp.completed = true
      GROUP BY cs.student_id, cs.course_id
    )
    SELECT 
      ci.student_id,
      COUNT(CASE 
        WHEN COALESCE(comp.completed_count, 0) > 0 
         AND COALESCE(comp.completed_count, 0) < ci.total_items 
        THEN 1 
      END) as courses_in_progress,
      COUNT(CASE 
        WHEN COALESCE(comp.completed_count, 0) = ci.total_items 
         AND ci.total_items > 0 
        THEN 1 
      END) as courses_completed
    FROM course_items ci
    LEFT JOIN completed_items comp 
      ON ci.student_id = comp.student_id 
      AND ci.course_id = comp.course_id
    GROUP BY ci.student_id
    `,
      [studentId]
    );

    // 3️⃣ Get community support count for this student
    const communityCount = await this.dataSource
      .getRepository(CourseCommunity)
      .createQueryBuilder('cc')
      .where('cc.user.id = :studentId', { studentId })
      .getCount();

    // 4️⃣ Extract progress data
    const progress = progressStats[0] || {
      courses_in_progress: 0,
      courses_completed: 0,
    };

    // 5️⃣ Build the response
    const profile = student.profile;

    return {
      id: student.id,
      name: profile
        ? `${profile.firstName} ${profile.lastName}`
        : 'Unknown',
      avatar: profile?.photoUrl || null,
      phone: profile?.phoneNumber || null,
      email: student.email,
      address: profile?.city || null,
      coursesInProgress: parseInt(progress.courses_in_progress) || 0,
      coursesCompleted: parseInt(progress.courses_completed) || 0,
      certificatesEarned: parseInt(progress.courses_completed) || 0, //Temporary until we make certifications
      communitySupport: communityCount,
    };
  }

  async getCourseFiltersSingleQuery(): Promise<any> {
    const PUBLISHED_CONDITION = `co.deleted_at IS NULL AND co.status = 'published' AND co."isActive" = true`;

    const result = await this.courseRepo.query(`
    WITH category_counts AS (
      SELECT 
        c.name as category_name,
        c.slug as category_slug,
        COUNT(co.id) as category_count
      FROM courses co
      INNER JOIN course_categories c ON co.category_id = c.id
      WHERE ${PUBLISHED_CONDITION} AND c.deleted_at IS NULL 
      GROUP BY c.name, c.slug
    ),
    subcategory_counts AS (
      SELECT 
        sc.name as subcategory_name,
        sc.slug as subcategory_slug,
        COUNT(co.id) as subcategory_count
      FROM courses co
      INNER JOIN course_categories sc ON co.subcategory_id = sc.id
      WHERE ${PUBLISHED_CONDITION} AND sc.deleted_at IS NULL 
      GROUP BY sc.name, sc.slug
    ),
    language_counts AS (
      SELECT 
        unnest(co.languages) as language_code,
        COUNT(co.id) as language_count
      FROM courses co
      WHERE ${PUBLISHED_CONDITION} AND co.languages IS NOT NULL
      GROUP BY unnest(co.languages)
    ),
    type_counts AS (
      SELECT 
        co.type as course_type,
        COUNT(co.id) as type_count
      FROM courses co
      WHERE ${PUBLISHED_CONDITION} AND co.type IS NOT NULL
      GROUP BY co.type
    ),
    level_counts AS (
      SELECT 
        co.level as course_level,
        COUNT(co.id) as level_count
      FROM courses co
      WHERE ${PUBLISHED_CONDITION} AND co.level IS NOT NULL
      GROUP BY co.level
    ),
    rating_counts AS (
      SELECT 
        FLOOR(co.average_rating) as rating,
        COUNT(co.id) as rating_count
      FROM courses co
      WHERE ${PUBLISHED_CONDITION} AND co.average_rating IS NOT NULL AND co.average_rating >= 1
      GROUP BY FLOOR(co.average_rating)
    ),
duration_counts AS (
  SELECT 
    CASE 
      -- Short durations (hours)
      WHEN co.course_duration_unit = 'hours' AND co.course_duration < 2 THEN 'less2Hours'
      WHEN co.course_duration_unit = 'hours' AND co.course_duration BETWEEN 2 AND 10 THEN '2_10Hours'
      
      -- Medium durations (weeks ≈ months)
      WHEN co.course_duration_unit = 'weeks' AND co.course_duration BETWEEN 1 AND 4 THEN '1_4Weeks'
      WHEN co.course_duration_unit = 'weeks' AND co.course_duration BETWEEN 5 AND 12 THEN '1_3Months'
      
      -- Long durations (months) - FIXED: No overlap
      WHEN co.course_duration_unit = 'months' AND co.course_duration >= 1 AND co.course_duration < 3 THEN '1_3Months'
      WHEN co.course_duration_unit = 'months' AND co.course_duration >= 3 AND co.course_duration <= 6 THEN '3_6Months'
      WHEN co.course_duration_unit = 'months' AND co.course_duration > 6 THEN 'more6Months'
      
      ELSE 'other'
    END as duration_value,
    COUNT(co.id) as duration_count
  FROM courses co
  WHERE ${PUBLISHED_CONDITION} 
    AND co.course_duration IS NOT NULL 
    AND co.course_duration_unit IS NOT NULL
  GROUP BY 
    CASE 
      WHEN co.course_duration_unit = 'hours' AND co.course_duration < 2 THEN 'less2Hours'
      WHEN co.course_duration_unit = 'hours' AND co.course_duration BETWEEN 2 AND 10 THEN '2_10Hours'
      WHEN co.course_duration_unit = 'weeks' AND co.course_duration BETWEEN 1 AND 4 THEN '1_4Weeks'
      WHEN co.course_duration_unit = 'weeks' AND co.course_duration BETWEEN 5 AND 12 THEN '1_3Months'
      WHEN co.course_duration_unit = 'months' AND co.course_duration >= 1 AND co.course_duration < 3 THEN '1_3Months'
      WHEN co.course_duration_unit = 'months' AND co.course_duration >= 3 AND co.course_duration <= 6 THEN '3_6Months'
      WHEN co.course_duration_unit = 'months' AND co.course_duration > 6 THEN 'more6Months'
      ELSE 'other'
    END
),
    price_ranges AS (
      SELECT 
        cp."currencyCode" as currency,
        MIN(COALESCE(cp."salePrice", cp."regularPrice")) as min_price, 
        MAX(cp."regularPrice") as max_price
      FROM courses co
      LEFT JOIN course_pricing cp ON co.id = cp.course_id AND cp."isActive" = true
      WHERE ${PUBLISHED_CONDITION} AND cp.id IS NOT NULL
      GROUP BY cp."currencyCode"
    ),
    free_course_count AS (
      SELECT 
        COUNT(id) as free_count
      FROM courses co
      WHERE ${PUBLISHED_CONDITION} AND co.is_course_free = true
    )
    
    SELECT 
      (SELECT json_agg(json_build_object('name', category_name, 'slug', category_slug, 'count', category_count)) FROM category_counts) as categories,
      (SELECT json_agg(json_build_object('name', subcategory_name, 'slug', subcategory_slug, 'count', subcategory_count)) FROM subcategory_counts) as subcategories,
      (SELECT json_agg(json_build_object('name', 
        CASE language_code 
          WHEN 'en' THEN 'English' WHEN 'ar' THEN 'Arabic' WHEN 'fr' THEN 'French' 
          WHEN 'es' THEN 'Spanish' WHEN 'de' THEN 'German' WHEN 'zh' THEN 'Chinese'
          WHEN 'ja' THEN 'Japanese' WHEN 'ru' THEN 'Russian' WHEN 'pt' THEN 'Portuguese'
          WHEN 'it' THEN 'Italian' WHEN 'ko' THEN 'Korean' WHEN 'tr' THEN 'Turkish'
          WHEN 'hi' THEN 'Hindi' ELSE upper(language_code) END, 
        'code', language_code, 'count', language_count)) FROM language_counts) as languages,
      (SELECT json_agg(json_build_object('type', course_type, 'count', type_count)) FROM type_counts) as course_types,
      (SELECT json_agg(json_build_object('level', course_level, 'count', level_count)) FROM level_counts) as course_levels,
      (SELECT json_agg(json_build_object('rating', rating, 'count', rating_count)) FROM rating_counts) as ratings,
      (SELECT json_agg(json_build_object(
  'label',
  CASE duration_value
    WHEN 'less2Hours' THEN 'Less Than 2 Hours'
    WHEN '2_10Hours' THEN '2-10 Hours'
    WHEN '1_4Weeks' THEN '1-4 Weeks' 
    WHEN '1_3Months' THEN '1-3 Months'
    WHEN '3_6Months' THEN '3-6 Months'
    WHEN 'more6Months' THEN 'More Than 6 Months'
    ELSE 'Other'
  END,
  'value', duration_value,
  'count', duration_count
)) FROM duration_counts WHERE duration_value != 'other') as durations,
      (SELECT json_agg(json_build_object('currency', currency, 'min', min_price, 'max', max_price)) FROM price_ranges) as price_range,
      (SELECT json_build_object('count', free_count) FROM free_course_count) as free
  `);

    const defaultPriceRange = [{ currency: 'EGP', min: 0, max: 1000 }];

    return result[0]
      ? {
        ...result[0],
        price_range: result[0].price_range || defaultPriceRange,
        free: result[0].free || { count: 0 },
        durations: result[0].durations || [] // Add empty array if no durations
      }
      : {
        categories: [], subcategories: [], languages: [],
        courseTypes: [], courseLevels: [], ratings: [],
        durations: [], // Add empty durations array
        price_range: defaultPriceRange,
        free: { count: 0 },
      };
  }
}
