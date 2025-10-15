import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { QueryConfig } from '../common/utils/query-options';
import { Profile } from 'src/profile/entities/profile.entity';
import { CurrencyCode } from './course-pricing/entities/course-pricing.entity';
import { CourseStudent } from './entities/course-student.entity';
import { User } from 'src/user/entities/user.entity';
import { CourseProgress } from './course-progress/entities/course-progress.entity';
import { CourseSectionItem } from './course-section/entities/course-section-item.entity';

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

    // ✅ Map instructor to compact form
    result.data = result.data.map((course: any) => ({
      ...course,
      instructor: this.mapInstructor(course),
    }));

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
    }));

    // ✅ Map instructor data into a compact format and add related courses
    return {
      ...course,
      instructor: this.mapInstructor(course),
      relatedCourses, // ✅ NEW: Add related courses here
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

    // ✅ Filter pricing by user’s currency (if applicable)
    if (currency) {
      result.data.forEach((course: any) => {
        course.pricings = course.pricings.filter(
          (p) => p.currencyCode === currency,
        );
      });
    }

    // ✅ Map instructor data into a compact structure
    result.data = result.data.map((course: any) => ({
      ...course,
      instructor: this.mapInstructor(course),
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
    }));

    return relatedCourses;
  }
}
