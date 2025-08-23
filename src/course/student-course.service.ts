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
  ) {}

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
      .andWhere('course.deleted_at IS NULL');

    const result = await paginate(query, qb, COURSE_PAGINATION_CONFIG);

    // ✅ Filter pricings by user’s allowed currency
    if (currency) {
      result.data.forEach((course) => {
        course.pricings = course.pricings.filter(
          (p) => p.currencyCode === currency,
        );
      });
    }

    return result;
  }

  async findOne(id: string, user: any): Promise<Course> {
    const currency = await this.getCurrencyForUser(user.sub);

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
      .where('course.id = :id', { id })
      .andWhere('course.deleted_at IS NULL')
      .orderBy('section.order', 'ASC')
      .addOrderBy('item.order', 'ASC')
      .addOrderBy('quizQuestion.order', 'ASC');

    const course = await qb.getOne();

    if (!course) throw new NotFoundException('Course not found');

    // ✅ Filter pricing by nationality
    if (currency) {
      course.pricings = course.pricings.filter(
        (p) => p.currencyCode === currency,
      );
    }

    return course;
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
      .innerJoin('course.enrollments', 'enrollment') // <-- correct relation
      .innerJoin('enrollment.student', 'student', 'student.id = :userId', {
        userId,
      })
      .leftJoinAndSelect('course.pricings', 'pricing')
      .andWhere('course.deleted_at IS NULL');

    const result = await paginate(query, qb, COURSE_PAGINATION_CONFIG);

    if (currency) {
      result.data.forEach((course) => {
        course.pricings = course.pricings.filter(
          (p) => p.currencyCode === currency,
        );
      });
    }

    return result;
  }
}
