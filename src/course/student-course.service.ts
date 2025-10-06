import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { QueryConfig } from '../common/utils/query-options';
import { Profile } from 'src/profile/entities/profile.entity';
import { CurrencyCode } from './course-pricing/entities/course-pricing.entity';
import { CourseStudent } from './entities/course-student.entity';
import { User } from 'src/user/entities/user.entity';

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
    const currency = await this.getCurrencyForUser(user.sub);

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
      // Full query with relations
      course = await this.courseRepo
        .createQueryBuilder('course')
        .leftJoinAndSelect('course.pricings', 'pricing')
        .leftJoinAndSelect('course.sections', 'section')
        .leftJoinAndSelect('section.items', 'item')
        .leftJoinAndSelect('item.lecture', 'lecture')
        .leftJoinAndSelect('item.quiz', 'quiz')
        .leftJoinAndSelect('quiz.quizQuestions', 'quizQuestion')
        .leftJoinAndSelect('quizQuestion.question', 'question')
        .leftJoinAndSelect('item.assignment', 'assignment')
        .leftJoinAndSelect('course.instructor', 'instructor')          // ✅
        .leftJoinAndSelect('instructor.profile', 'instructorProfile') // ✅
        .where('course.id = :id', { id })
        .andWhere('course.deleted_at IS NULL')
        .orderBy('section.order', 'ASC')
        .addOrderBy('item.order', 'ASC')
        .addOrderBy('quizQuestion.order', 'ASC')
        .getOne();

      if (course) this.randomizeCourseQuizzes(course);
    } else {
      // Not enrolled → only basic info
      course = await this.courseRepo.findOne({
        where: { id, deleted_at: null },
        relations: ['pricings', 'instructor', 'instructor.profile'], // ✅
      });
    }

    if (!course) throw new NotFoundException('Course not found');

    // Filter pricing by user currency
    if (currency) {
      course.pricings = course.pricings.filter(
        (p) => p.currencyCode === currency,
      );
    }

    // Map instructor to compact form
    return {
      ...course,
      instructor: this.mapInstructor(course),
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
}
