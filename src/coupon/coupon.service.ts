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
    academyId?: string,
  ): Promise<Coupon> {
    let courseIds: string[] = [];
    const createdByAcademy = role.includes('academy') && academyId;
    let finalAcademyId: string | undefined = createdByAcademy ? academyId : undefined;

    switch (dto.applicable_for) {
      case CouponApplicability.ALL_INSTRUCTOR_COURSES:
        // ✅ Only instructors can use this
        // 🛑 NEW LOGIC for Academy Admin/User
        if (role === 'academy_admin' && finalAcademyId) {
          // Academy Admin: Use ALL courses in their academy
          courseIds = await this.findIdsByAcademy(finalAcademyId);
        } else if (role === 'instructor' || role === 'academy_user') {
          // Instructor or Academy User: Use ALL courses created by them
          courseIds = await this.findIdsByInstructor(userId);
        } else {
          throw new HttpException(
            'Only instructors, academy users, or academy admins can use this applicability type.',
            HttpStatus.FORBIDDEN,
          );
        }
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

    // const disallowedCourses = await this.findCoursesDisallowingCoupons(courseIds);
    // if (disallowedCourses.length > 0) {
    //   const names = disallowedCourses.map((c) => c.name).join(', ');
    //   throw new HttpException(
    //     `The following courses do not allow coupons: ${names}`,
    //     HttpStatus.BAD_REQUEST,
    //   );
    // }

    try {
      const coupon = this.couponRepository.create({
        ...dto,
        academy_id: finalAcademyId,
        created_by: userId,
        course_ids: courseIds,
      });

      return await this.couponRepository.save(coupon);
    } catch (err: any) {
      // ✅ Handle Postgres duplicate key error (e.g., duplicate coupon code)
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';
        if (detail.includes('(code)')) {
          throw new HttpException(
            `Coupon code "${dto.code}" already exists.`,
            HttpStatus.BAD_REQUEST,
          );
        }

        throw new HttpException(
          'Duplicate entry detected. Please use unique values.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Unknown error
      console.error('Coupon creation (with courses) failed:', err);
      throw new HttpException(
        'An unexpected error occurred while creating the coupon.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // src/coupon/coupon.service.ts

  async findAll(
    query: PaginateQuery,
    userId: string,
    role: string,
    academyId?: string, // Accepting the academyId from the controller
  ): Promise<Paginated<Coupon>> {

    const qb = this.couponRepository.createQueryBuilder('coupon');

    const roleLower = role.toLowerCase();

    // ✅ 1. Platform Admin (Role: 'admin') - Sees all coupons (no WHERE clause needed)
    if (roleLower === 'admin') {
      // No filter applied.
    }
    // ✅ 2. Academy Admin (Role: 'academy_admin') - Sees all coupons associated with their academy
    else if (roleLower === 'academy_admin' && academyId) {
      // Filter by the academy_id stored on the coupon
      qb.where('coupon.academy_id = :academyId', { academyId });
    }
    // ✅ 3. Instructor/Academy User (Role: 'instructor' or 'academy_user') - Sees only coupons they created
    else if (roleLower === 'instructor' || roleLower === 'academy_user') {
      // Filter by the user who created the coupon
      qb.where('coupon.created_by = :userId', { userId });
    }
    // ❌ Fallback: If any other role tries to access, they see nothing (or an empty list due to bad filter)
    // For safety, explicitly filter by userId for non-admin/non-academy roles or roles without proper access
    else {
      // This ensures unauthenticated/unauthorized users get nothing specific.
      // It's safe to default to filtering by user ID here.
      qb.where('coupon.created_by = :userId', { userId });
    }

    return paginate(query, qb, COUPON_PAGINATION_CONFIG);
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon with ID ${id} not found`);
    return coupon;
  }

  async update(
    id: string,
    updateCouponDto: UpdateCouponDto,
    userId: string, // User ID from req.user.sub
    userRole: string, // User Role from req.user.role
  ): Promise<Coupon> {
    // 1. Find the coupon (findOne should throw NotFoundException if not found)
    const coupon = await this.findOne(id); // Assume this method retrieves the entity

    // 2. Authorization Check (New Logic)
    const isAdmin = userRole === 'admin'; // Case-sensitive check
    const isOwner = coupon.created_by === userId; // Assuming 'createdBy' stores the user ID

    if (!isAdmin && !isOwner) {
      throw new HttpException(
        'You do not have permission to update this coupon. Only the creator or an admin can modify it.',
        HttpStatus.FORBIDDEN, // Use 403 Forbidden for authorization failure
      );
    }

    // 3. Proceed with update logic
    Object.assign(coupon, updateCouponDto);

    try {
      return await this.couponRepository.save(coupon);
    } catch (err: any) {
      // ... your existing duplicate key handling logic remains the same ...
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';
        if (detail.includes('(code)')) {
          throw new HttpException(
            `Coupon code "${updateCouponDto.code}" already exists.`,
            HttpStatus.BAD_REQUEST,
          );
        }
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

  async remove(
    id: string,
    userId: string, // User ID from req.user.sub
    userRole: string, // User Role from req.user.role
  ): Promise<void> {
    // 1. Find the coupon
    const coupon = await this.findOne(id);

    // 2. Authorization Check (New Logic)
    const isAdmin = userRole === 'admin';
    const isOwner = coupon.created_by === userId; // Assuming 'createdBy' stores the user ID

    if (!isAdmin && !isOwner) {
      throw new HttpException(
        'You do not have permission to delete this coupon. Only the creator or an admin can delete it.',
        HttpStatus.FORBIDDEN, // Use 403 Forbidden
      );
    }

    // 3. Proceed with soft delete
    await this.couponRepository.softRemove(coupon);
  }

  async checkCouponEligibility(couponCode: string, courseIdsParam: string) {
    if (!couponCode || !courseIdsParam) {
      throw new HttpException(
        'couponCode and courseIds are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Parse course IDs from comma-separated string
    const courseIds = courseIdsParam.split(',').map(id => id.trim()).filter(id => id);

    if (courseIds.length === 0) {
      throw new HttpException(
        'At least one valid course ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Remove duplicates
    const uniqueCourseIds = [...new Set(courseIds)];

    // Find coupon
    const coupon = await this.couponRepository.findOne({
      where: { code: couponCode }
    });

    if (!coupon) {
      throw new HttpException('Coupon not found', HttpStatus.NOT_FOUND);
    }

    // Check eligibility for each course
    const results = uniqueCourseIds.map(courseId => {
      const isValid = Array.isArray(coupon.course_ids) && coupon.course_ids.includes(courseId);
      return { id: courseId, isValid };
    });

    return {
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.offer_type,
        discountValue: coupon.amount,
        applicableFor: coupon.applicable_for,
        allowedCourses: coupon.course_ids ?? [],
      },
      results
    };
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
  // async findCoursesDisallowingCoupons(courseIds: string[]): Promise<Course[]> {
  //   if (!courseIds.length) return [];

  //   return this.courseRepository.find({
  //     where: {
  //       id: In(courseIds),
  //       allowPlatformCoupons: false,
  //     },
  //     select: ['id', 'name'],
  //   });
  // }

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

  /**
   * Fetch all active and published courses in a specific academy.
   * (for academy_admin ALL_INSTRUCTOR_COURSES)
   */
  async findIdsByAcademy(academyId: string): Promise<string[]> {
    const courses = await this.courseRepository.find({
      where: {
        academy: { id: academyId }, // Assuming Course entity has a relation to Academy
        isActive: true,
        status: CourseStatus.PUBLISHED,
      },
      select: ['id'],
    });

    return courses.map((c) => c.id);
  }
}
