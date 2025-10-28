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
  sortableColumns: ['created_at', 'name', 'category', 'status'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    name: [FilterOperator.ILIKE], // search by course name (case-insensitive)
    category: [FilterOperator.EQ],
    status: [FilterOperator.EQ],
    isActive: [FilterOperator.EQ],
    createdBy: [FilterOperator.EQ],
  },
  relations: [], // add relations if needed
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

  private async getCurrencyForUser(
    userId: string,
  ): Promise<CurrencyCode | null> {
    const profile = await this.profileRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!profile || !profile.nationality) {
      return null;
    }

    // ✅ simple mapping: Egyptian nationality → EGP
    if (profile.nationality.toLowerCase() === 'egyptian') {
      return CurrencyCode.EGP;
    }

    // TODO: expand mapping for other nationalities (e.g. Saudi → SAR)
    return CurrencyCode.USD; // fallback default
  }

  async getPaginatedCourses(query: PaginateQuery, user: any) {
    const currency = user ? await this.getCurrencyForUser(user.sub) : 'USD';

    const qb = this.courseRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.pricings', 'pricing')
      .leftJoin('course.academy', 'academy') // 👈 ADD THIS LINE
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
      .andWhere('course.deleted_at IS NULL')

      // ✅ Count total enrolled students per course
      .loadRelationCountAndMap('course.studentCount', 'course.enrollments')

      // ✅ Count lectures per course
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

      // ✅ Count quizzes per course
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

    // ✅ Filter pricings by user's preferred currency (if applicable)
    if (currency) {
      result.data.forEach((course: any) => {
        course.pricings = course.pricings.filter(
          (p) => p.currencyCode === currency,
        );
      });
    }

    const instructorIds = [
      ...new Set(
        result.data
          .map((course: any) => course.createdBy)
          .filter((id): id is string => !!id),
      ),
    ];

    // ✅ OPTIMIZED: Bulk fetch all academy instructors in one query and instructor stats
    const [academyInstructorsMap, instructorStatsMap] = await Promise.all([
      this.courseService.getAcademyInstructorsBulk(result.data as Course[]),
      this.courseService.getInstructorStatsBulk(instructorIds), // 🎯 NEW: Bulk fetch instructor stats
    ]);

    result.data = result.data.map((course) => {
      const mappedInstructor = this.mapInstructor(course);
      const instructorStats = instructorStatsMap.get(course.createdBy); // 🎯 NEW: Get stats by ID

      return {
        ...(course as any),
        instructor: mappedInstructor ? {
          ...mappedInstructor,
          // 🎯 NEW: Inject the bulk-fetched stats
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
    const currency = await this.getCurrencyForUser(user.sub);

    const enrollment = await this.courseStudentRepository.findOne({
      where: { course: { id }, student: { id: user.sub } },
    });

    let course: Course | null;

    if (enrollment) {
      // ✅ Enrolled users get full course details
      const qb = this.courseRepo
        .createQueryBuilder('course')
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

        // ✅ Add counts
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
        .leftJoin('course.academy', 'academy') // 👈 ADD THIS LINE
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

        // ✅ Add counts here too
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
    if (currency) {
      course.pricings = course.pricings.filter(
        (p) => p.currencyCode === currency,
      );
    }

    // ✅ NEW: Fetch related courses (smart, lightweight, no duplicates)
    const relatedQuery = this.courseRepo
      .createQueryBuilder('related')
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
        `(SELECT COUNT(cf.id) > 0 FROM course_favorite cf WHERE cf.course_id = related.id AND cf.student_id = '${user.sub}') AS "isFavorite"`,
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

    // ✅ For single course, direct fetch is fine
    const academyInstructors = await this.courseService.getAcademyInstructorsForCourse(course);

    // ✅ Map instructor data into a compact format and add related courses
    return {
      ...course,
      instructor: this.mapInstructor(course),
      academyInstructors,
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
    const currency = await this.getCurrencyForUser(userId);

    const qb = this.courseRepo
      .createQueryBuilder('course')
      .innerJoin('course.enrollments', 'enrollment')
      .innerJoin('enrollment.student', 'student', 'student.id = :userId', {
        userId,
      })
      .leftJoinAndSelect('course.pricings', 'pricing')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoin('course.academy', 'academy') // 👈 ADD THIS LINE
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

    // ✅ Filter pricing by user's currency (if applicable)
    if (currency) {
      result.data.forEach((course: any) => {
        course.pricings = course.pricings.filter(
          (p) => p.currencyCode === currency,
        );
      });
    }

    // ✅ Get progress for all enrolled courses in bulk
    const courseIds = result.data.map((course: any) => course.id);
    const progressMap = await this.getBulkCourseProgress(courseIds, userId);

    result.data.forEach((course: any) => {
      course.progressPercentage = progressMap.get(course.id) || 0;
    });

    // ✅ OPTIMIZED: Bulk fetch all academy instructors in one query
    const academyInstructorsMap = await this.courseService.getAcademyInstructorsBulk(
      result.data as Course[],
    );

    // ✅ Map instructor data into a compact structure
    result.data = result.data.map((course) => ({
      ...(course as any),
      instructor: this.mapInstructor(course),
      academyInstructors: academyInstructorsMap.get(course.id) || [],
    }));

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
    const currency = await this.getCurrencyForUser(userId);

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
    if (currency) {
      favorites.forEach((course: any) => {
        course.pricings = course.pricings.filter(
          (p) => p.currencyCode === currency,
        );
      });
    }

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
}
