import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Coupon, CouponApplicability } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryConfig } from 'src/common/utils/query-options';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Course, CourseStatus } from 'src/course/entities/course.entity';

export const COUPON_PAGINATION_CONFIG: QueryConfig<Coupon> = {
  sortableColumns: ['created_at', 'updated_at', 'name', 'code', 'status'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    name: [FilterOperator.ILIKE], // search by coupon name
    code: [FilterOperator.ILIKE], // search by code
    status: [FilterOperator.EQ], // filter by status
    offer_type: [FilterOperator.EQ], // filter by offer type
  },
};

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) { }

  async create(createCouponDto: CreateCouponDto, userId: string): Promise<Coupon> {
    try {
      const coupon = this.couponRepository.create({
        ...createCouponDto,
        created_by: userId,
      });

      return await this.couponRepository.save(coupon);
    } catch (err: any) {
      // Check for Postgres duplicate error
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';
        if (detail.includes('(code)')) {
          throw new HttpException(
            `Coupon code "${createCouponDto.code}" already exists.`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Generic duplicate field fallback
        throw new HttpException(
          `Duplicate entry detected. Please use unique values.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Unknown error
      console.error('Coupon creation failed:', err);
      throw new HttpException(
        'An unexpected error occurred while creating the coupon.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createWithCourses(
    dto: CreateCouponDto,
    userId: string,
    role: string,
  ): Promise<Coupon> {
    let courseIds: string[] = [];

    switch (dto.applicable_for) {
      case CouponApplicability.ALL_INSTRUCTOR_COURSES:
        // ✅ Only instructors can use this
        if (role !== 'instructor') {
          throw new HttpException(
            'Only instructors can create coupons for all their courses.',
            HttpStatus.FORBIDDEN,
          );
        }
        courseIds = await this.findIdsByInstructor(userId);
        break;

      case CouponApplicability.CATEGORY_COURSES:
        if (role !== 'admin') {
          throw new HttpException(
            'Only admins can create coupons applicable to category courses.',
            HttpStatus.FORBIDDEN,
          );
        }

        courseIds = await this.findIdsByCategory(dto.category_id);
        break;

      case CouponApplicability.SUBCATEGORY_COURSES:
        if (role !== 'admin') {
          throw new HttpException(
            'Only admins can create coupons applicable to subcategory courses.',
            HttpStatus.FORBIDDEN,
          );
        }

        courseIds = await this.findIdsBySubcategory(dto.subcategory_id);
        break;

      case CouponApplicability.MULTIPLE_COURSES:
        if (!dto.course_ids?.length) {
          throw new HttpException(
            'At least one course ID must be provided when applicable_for = MULTIPLE_COURSES',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (role === 'admin') {
          // ✅ Admin → can include any published courses
          courseIds = await this.findValidCourses(dto.course_ids);
        } else {
          // ✅ Instructor → can only include their own published courses
          const invalidCourses = await this.findInvalidInstructorCourses(
            dto.course_ids,
            userId,
          );

          if (invalidCourses.length > 0) {
            const names = invalidCourses.map((c) => c.name).join(', ');
            throw new HttpException(
              `You can only create coupons for your own published courses. Invalid: ${names}`,
              HttpStatus.FORBIDDEN,
            );
          }

          courseIds = dto.course_ids;
        }
        break;

      case CouponApplicability.ALL_PLATFORM_COURSES:
        // ✅ Only admin can create platform-wide coupons
        if (role !== 'admin') {
          throw new HttpException(
            'Only admins can create platform-wide coupons.',
            HttpStatus.FORBIDDEN,
          );
        }

        courseIds = await this.findAllCourseIds();
        break;

      default:
        throw new HttpException(
          'Invalid coupon applicability type.',
          HttpStatus.BAD_REQUEST,
        );
    }

    if (!courseIds?.length) {
      throw new HttpException(
        'No eligible courses found for this coupon configuration.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const disallowedCourses = await this.findCoursesDisallowingCoupons(courseIds);
    if (disallowedCourses.length > 0) {
      const names = disallowedCourses.map((c) => c.name).join(', ');
      throw new HttpException(
        `The following courses do not allow coupons: ${names}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const coupon = this.couponRepository.create({
      ...dto,
      created_by: userId,
      course_ids: courseIds,
    });

    return this.couponRepository.save(coupon);
  }

  async findAll(
    query: PaginateQuery,
    userId: string,
  ): Promise<Paginated<Coupon>> {
    const qb = this.couponRepository
      .createQueryBuilder('coupon')
      .where('coupon.created_by = :userId', { userId });

    return paginate(query, qb, COUPON_PAGINATION_CONFIG);
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon with ID ${id} not found`);
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);
    Object.assign(coupon, updateCouponDto);

    try {
      return await this.couponRepository.save(coupon);
    } catch (err: any) {
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';

        if (detail.includes('(code)')) {
          throw new HttpException(
            `Coupon code "${updateCouponDto.code}" already exists.`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Generic duplicate constraint fallback
        throw new HttpException(
          `Duplicate entry detected. Please use unique values.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      console.error('Coupon update failed:', err);
      throw new HttpException(
        'An unexpected error occurred while updating the coupon.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.findOne(id);
    await this.couponRepository.softRemove(coupon);
  }


  /**
   * Fetch all active courses created by a specific instructor
   */
  async findIdsByInstructor(instructorId: string): Promise<string[]> {
    const courses = await this.courseRepository.find({
      where: {
        createdBy: instructorId,
        isActive: true,
        status: CourseStatus.PUBLISHED,
      },
      select: ['id'],
    });

    return courses.map((c) => c.id);
  }

  /**
   * Fetch all active and published courses on the platform
   * (for admin-level coupons)
   */
  async findAllCourseIds(): Promise<string[]> {
    const courses = await this.courseRepository.find({
      where: {
        isActive: true,
        status: CourseStatus.PUBLISHED,
      },
      select: ['id'],
    });

    return courses.map((c) => c.id);
  }

  /**
   * Find all courses among a given list that do NOT allow platform coupons.
   * Used to validate coupon applicability.
   */
  async findCoursesDisallowingCoupons(courseIds: string[]): Promise<Course[]> {
    if (!courseIds.length) return [];

    return this.courseRepository.find({
      where: {
        id: In(courseIds),
        allowPlatformCoupons: false,
      },
      select: ['id', 'name'],
    });
  }

  /**
 * Find any courses that do not belong to the given instructor.
 * Used to prevent teachers from applying coupons to other teachers' courses.
 */
  async findCoursesNotOwnedByInstructor(
    courseIds: string[],
    instructorId: string,
  ): Promise<Course[]> {
    if (!courseIds.length) return [];

    const courses = await this.courseRepository.find({
      where: {
        id: In(courseIds),
        isActive: true,
      },
      select: ['id', 'name', 'createdBy'],
    });

    return courses.filter((c) => c.createdBy !== instructorId);
  }

  /**
 * Admin: returns published + active courses from given IDs.
 */
  async findValidCourses(courseIds: string[]): Promise<string[]> {
    const courses = await this.courseRepository.find({
      where: {
        id: In(courseIds),
        isActive: true,
        status: CourseStatus.PUBLISHED,
      },
      select: ['id'],
    });
    return courses.map((c) => c.id);
  }

  /**
   * Instructor: returns invalid courses (not owned, not active, or not published)
   */
  async findInvalidInstructorCourses(
    courseIds: string[],
    instructorId: string,
  ): Promise<Course[]> {
    const courses = await this.courseRepository.find({
      where: { id: In(courseIds) },
      select: ['id', 'name', 'createdBy', 'isActive', 'status'],
    });

    return courses.filter(
      (c) =>
        c.createdBy !== instructorId ||
        !c.isActive ||
        c.status !== CourseStatus.PUBLISHED,
    );
  }

  /**
   * Fetch courses in a specific category.
   * If instructorId is provided → filter to their own published courses.
   */
  async findIdsByCategory(categoryId: string, instructorId?: string): Promise<string[]> {
    if (!categoryId) {
      throw new HttpException(
        'Category ID must be provided when applicable_for = CATEGORY_COURSES',
        HttpStatus.BAD_REQUEST,
      );
    }

    const where: any = {
      category: { id: categoryId },
      isActive: true,
      status: CourseStatus.PUBLISHED,
    };

    if (instructorId) where.createdBy = instructorId;

    const courses = await this.courseRepository.find({
      where,
      select: ['id'],
    });

    return courses.map((c) => c.id);
  }

  /**
   * Fetch courses in a specific subcategory.
   * If instructorId is provided → filter to their own published courses.
   */
  async findIdsBySubcategory(subcategoryId: string, instructorId?: string): Promise<string[]> {
    if (!subcategoryId) {
      throw new HttpException(
        'Subcategory ID must be provided when applicable_for = SUBCATEGORY_COURSES',
        HttpStatus.BAD_REQUEST,
      );
    }

    const where: any = {
      subCategory: { id: subcategoryId },
      isActive: true,
      status: CourseStatus.PUBLISHED,
    };

    if (instructorId) where.createdBy = instructorId;

    const courses = await this.courseRepository.find({
      where,
      select: ['id'],
    });

    return courses.map((c) => c.id);
  }
}
