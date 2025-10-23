import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Course, CourseStatus } from '../course/entities/course.entity';
import { Profile } from '../profile/entities/profile.entity';
import { Role } from '../user/entities/roles.entity';
import { CourseSectionItem } from 'src/course/course-section/entities/course-section-item.entity';
import { CourseProgress } from 'src/course/course-progress/entities/course-progress.entity';

@Injectable()
export class AdminService {
  // 🧩 Cache role IDs (UUIDs)
  private cachedRoles: Record<string, string> = {};

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(CourseSectionItem)
    private readonly courseSectionItemRepo: Repository<CourseSectionItem>,
    @InjectRepository(CourseProgress)
    private readonly progressRepo: Repository<CourseProgress>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) { }

  async getDashboardStats(): Promise<any> {
    const [students, newStudents, courses, topInstructors] = await Promise.all([
      this.getStudentStats(),
      this.getNewStudentStats(),
      this.getCourseStats(),
      this.getTopInstructors(),
    ]);

    return { students, newStudents, courses, topInstructors };
  }

  /** ----------------- STUDENT STATS ----------------- */
  private async getStudentStats(): Promise<any> {
    const studentRoleId = await this.getRoleId('student');
    if (!studentRoleId) return { total: 0, yearOverYearChange: 0 };

    const oneYearAgo = this.subYears(new Date(), 1);

    const [total, studentsLastYear] = await Promise.all([
      this.userRepository.count({ where: { role: { id: studentRoleId } } }),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.roleId = :roleId', { roleId: studentRoleId })
        .andWhere('user.created_at <= :oneYearAgo', { oneYearAgo })
        .getCount(),
    ]);

    return {
      total,
      yearOverYearChange: this.calcPercentChange(total, studentsLastYear),
    };
  }

  private async getNewStudentStats(): Promise<any> {
    const studentRoleId = await this.getRoleId('student');
    if (!studentRoleId) return { newThisMonth: 0, monthOverMonthChange: 0 };

    const now = new Date();
    const startOfMonth = this.startOfMonth(now);
    const [startOfLastMonth, endOfLastMonth] = this.lastMonthRange(now);

    const [newThisMonth, newLastMonth] = await Promise.all([
      this.userRepository
        .createQueryBuilder('user')
        .where('user.roleId = :roleId', { roleId: studentRoleId })
        .andWhere('user.created_at >= :startOfMonth', { startOfMonth })
        .getCount(),
      this.userRepository
        .createQueryBuilder('user')
        .where('user.roleId = :roleId', { roleId: studentRoleId })
        .andWhere('user.created_at BETWEEN :startOfLastMonth AND :endOfLastMonth', {
          startOfLastMonth,
          endOfLastMonth,
        })
        .getCount(),
    ]);

    return {
      newThisMonth,
      monthOverMonthChange: this.calcPercentChange(newThisMonth, newLastMonth),
    };
  }

  /** ----------------- COURSE STATS ----------------- */
  private async getCourseStats(): Promise<any> {
    const now = new Date();
    const startOfMonth = this.startOfMonth(now);

    const [totalActive, newThisMonth] = await Promise.all([
      this.courseRepository.count({
        where: { status: CourseStatus.PUBLISHED, isActive: true },
      }),
      this.courseRepository
        .createQueryBuilder('course')
        .where('course.status = :status', { status: CourseStatus.PUBLISHED })
        .andWhere('course.isActive = true')
        .andWhere('course.created_at >= :startOfMonth', { startOfMonth })
        .getCount(),
    ]);

    return { totalActive, newThisMonth };
  }

  /** ----------------- TOP INSTRUCTORS ----------------- */
  private async getTopInstructors(limit = 10): Promise<any[]> {
    const instructorRoleId = await this.getRoleId('instructor');
    if (!instructorRoleId) return [];

    const topInstructors = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoin('profile.user', 'user')
      .leftJoin('profile.ratings', 'ratings')
      .leftJoin(Course, 'course', 'course.createdBy = user.id')
      .select([
        'user.id AS userId',
        'profile.firstName AS firstName',
        'profile.lastName AS lastName',
        'profile.photoUrl AS photoUrl',
        'profile.metadata AS metadata',
        'COALESCE(AVG(ratings.rating), 0) AS avgRating',
        'COUNT(DISTINCT ratings.id) AS totalRatings',
        'COUNT(DISTINCT course.id) AS totalCourses',
      ])
      .where('user.roleId = :roleId', { roleId: instructorRoleId })
      .groupBy('user.id, profile.firstName, profile.lastName, profile.photoUrl, profile.metadata')
      .orderBy('avgRating', 'DESC')
      .addOrderBy('totalRatings', 'DESC')
      .addOrderBy('totalCourses', 'DESC')
      .limit(limit)
      .getRawMany();

    return topInstructors.map((i) => ({
      id: i.userid,
      name: `${i.firstname || ''} ${i.lastname || ''}`.trim(),
      photoUrl: i.photourl || null,
      title: this.extractTitle(i.metadata),
      averageRating: Math.round(parseFloat(i.avgrating) * 10) / 10,
      totalRatings: parseInt(i.totalratings) || 0,
      totalCourses: parseInt(i.totalcourses) || 0,
    }));
  }

  /** ----------------- STUDENT LISTING ----------------- */
  async getAllStudents(page = 1, limit = 10): Promise<any> {
    const studentRoleId = await this.getRoleId('student');
    if (!studentRoleId) {
      return { students: [], pagination: this.paginationMeta(1, limit, 0) };
    }

    const pageNum = Math.max(1, parseInt(page + '', 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit + '', 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const [students, total] = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('user.roleId = :roleId', { roleId: studentRoleId })
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return {
      students: students.map((s) => ({
        studentId: s.id,
        name: s.profile
          ? `${s.profile.firstName || ''} ${s.profile.lastName || ''}`.trim()
          : 'N/A',
        email: s.email,
        joinDate: this.formatDate(s.created_at),
      })),
      pagination: this.paginationMeta(pageNum, limitNum, total),
    };
  }

  /** ----------------- UTILITIES ----------------- */
  private async getRoleId(name: string): Promise<string | null> {
    if (this.cachedRoles[name]) return this.cachedRoles[name];
    const role = await this.roleRepository.findOne({ where: { name } });
    if (role?.id) this.cachedRoles[name] = role.id;
    return role?.id || null;
  }

  private startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private lastMonthRange(date: Date): [Date, Date] {
    const start = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const end = new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
    return [start, end];
  }

  private subYears(date: Date, years: number): Date {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() - years);
    return d;
  }

  private calcPercentChange(current: number, previous: number): number {
    if (previous > 0) return Math.round(((current - previous) / previous) * 1000) / 10;
    return current > 0 ? 100 : 0;
  }

  private paginationMeta(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  private extractTitle(metadata: any): string {
    return metadata?.academicTitle || metadata?.title || 'Instructor';
  }

  private formatDate(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  async getCourseOverview(): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    /** 1️⃣ Total courses and new courses this month */
    const [totalCourses, newCoursesThisMonth] = await Promise.all([
      this.courseRepository.count({
        where: { status: CourseStatus.PUBLISHED, isActive: true },
      }),
      this.courseRepository
        .createQueryBuilder('course')
        .where('course.status = :status', { status: CourseStatus.PUBLISHED })
        .andWhere('course.isActive = true')
        .andWhere('course.created_at >= :startOfMonth', { startOfMonth })
        .getCount(),
    ]);

    /** 2️⃣ Average enrollments per course */
    const enrollmentStats = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollments')
      .select('course.id', 'courseId')
      .addSelect('COUNT(enrollments.id)', 'enrollmentCount')
      .groupBy('course.id')
      .getRawMany();

    const totalEnrollments = enrollmentStats.reduce(
      (sum, c) => sum + (parseInt(c.enrollmentcount, 10) || 0),
      0,
    );

    const averageEnrollment =
      enrollmentStats.length > 0
        ? Math.round((totalEnrollments / enrollmentStats.length) * 10) / 10
        : 0;

    /** 3️⃣ Completion rate across all courses */
    const courseIds = (await this.courseRepository.find({
      select: ['id'],
      where: { status: CourseStatus.PUBLISHED, isActive: true },
    })).map((c) => c.id);

    // total items per course
    const totalItemsQuery = await this.courseSectionItemRepo
      .createQueryBuilder('item')
      .select('course.id', 'courseId')
      .addSelect('COUNT(item.id)', 'totalCount')
      .leftJoin('item.section', 'section')
      .leftJoin('section.course', 'course')
      .where('course.id IN (:...courseIds)', { courseIds })
      .groupBy('course.id')
      .getRawMany();

    const totalItemsMap = new Map<string, number>(
      totalItemsQuery.map((row) => [row.courseId, parseInt(row.totalCount, 10) || 0]),
    );

    // completed items per course (all students)
    const completedItemsQuery = await this.progressRepo
      .createQueryBuilder('progress')
      .select('course.id', 'courseId')
      .addSelect('COUNT(progress.id)', 'completedCount')
      .leftJoin('progress.item', 'item')
      .leftJoin('item.section', 'section')
      .leftJoin('section.course', 'course')
      .where('progress.completed = :completed', { completed: true })
      .andWhere('course.id IN (:...courseIds)', { courseIds })
      .groupBy('course.id')
      .getRawMany();

    const completedItemsMap = new Map<string, number>(
      completedItemsQuery.map((row) => [row.courseId, parseInt(row.completedCount, 10) || 0]),
    );

    // compute completion rate per course
    const completionStatsMap = new Map<string, number>();
    courseIds.forEach((courseId) => {
      const total = totalItemsMap.get(courseId) || 0;
      const completed = completedItemsMap.get(courseId) || 0;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      completionStatsMap.set(courseId, completionRate);
    });

    const completionValues = Array.from(completionStatsMap.values());
    const averageCompletionRate =
      completionValues.length > 0
        ? Math.round(
          (completionValues.reduce((a, b) => a + b, 0) / completionValues.length) * 10,
        ) / 10
        : 0;

    /** 4️⃣ Top 5 performing courses (by enrollment count) */
    const topCourses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollments')
      .select('course.id', 'id')
      .addSelect('course.name', 'name')
      .addSelect('COUNT(enrollments.id)', 'enrollments')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isActive = true')
      .groupBy('course.id')
      .orderBy('enrollments', 'DESC')
      .limit(5)
      .getRawMany();

    const topCoursesWithCompletion = topCourses.map((course) => {
      const completionRate = completionStatsMap.get(course.id) || 0;
      return {
        id: course.id,
        name: course.name,
        enrollments: parseInt(course.enrollments, 10) || 0,
        completionRate: Math.round(completionRate * 10) / 10,
      };
    });

    /** ✅ Final return */
    return {
      totalCourses,
      newCoursesThisMonth,
      averageEnrollment,
      averageCompletionRate,
      topCourses: topCoursesWithCompletion,
    };
  }
}
