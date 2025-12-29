import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Brackets, DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Course, CourseStatus } from '../course/entities/course.entity';
import { Profile } from '../profile/entities/profile.entity';
import { Role } from '../user/entities/roles.entity';
import { CourseSectionItem } from 'src/course/course-section/entities/course-section-item.entity';
import { CourseProgress } from 'src/course/course-progress/entities/course-progress.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { IdentityVerification, IdentityVerificationStatus } from 'src/user/entities/identity-verification.entity';
import { Quiz } from 'src/quiz/entities/quiz.entity';
import { QuizQuestion } from 'src/quiz/entities/quiz-question.entity';
import { QuizAttempt } from 'src/quiz/entities/quiz-attempts.entity';
import { Question } from 'src/quiz/entities/question.entity';
import { GenderFilter } from './admin.controller';
import { EnrollmentDetailDto, EnrollmentsListResponseDto, EnrollmentStatus } from './dto/enrollment-detail.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ProfileService } from 'src/profile/profile.service';
import { EmailService } from '../common/email.service';
import { CourseRating } from 'src/course/entities/course-rating.entity';
import { Academy } from 'src/academy/entities/academy.entity';
import { CreateInstructorDto } from './dto/create-instructor.dto';
import { ProfileMetadataDto } from 'src/profile/dto/profile-metadata.dto';
import { Payment, PaymentStatus } from 'src/payment/entities/payment.entity';
import { Transaction, TransactionStatus } from 'src/payment/entities/transaction.entity';

interface GetAllTransactionsFilters {
  creatorId?: string;
  buyerId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

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
    @InjectRepository(CourseStudent)
    private readonly courseStudentRepo: Repository<CourseStudent>,
    @InjectRepository(IdentityVerification)
    private readonly identityRepository: Repository<IdentityVerification>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>, // 👈 New injection
    @InjectRepository(QuizQuestion)
    private readonly quizQuestionRepository: Repository<QuizQuestion>, // 👈 New injection
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>, // 👈 New injection
    @InjectRepository(QuizAttempt)
    private readonly quizAttemptRepository: Repository<QuizAttempt>, // 👈 New injection
    @InjectRepository(CourseRating)
    private ratingRepo: Repository<CourseRating>,
    @InjectRepository(Academy) // Replace 'Academy' with your actual academy entity
    private readonly academyRepository: Repository<Academy>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private readonly profileService: ProfileService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource
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

    /** 1️⃣ Total courses and new courses this month - executed in parallel */
    const [totalCourses, newCoursesThisMonth] = await Promise.all([
      this.courseRepository.count({
        where: { status: CourseStatus.PUBLISHED, isActive: true },
      }),
      this.courseRepository
        .createQueryBuilder('course')
        .where('course.status = :status', { status: CourseStatus.PUBLISHED })
        .andWhere('course.isActive = :isActive', { isActive: true })
        .andWhere('course.created_at >= :startOfMonth', { startOfMonth })
        .getCount(),
    ]);

    // Early return if no courses exist
    if (totalCourses === 0) {
      return {
        totalCourses: 0,
        newCoursesThisMonth: 0,
        // averageEnrollment: 0,
        // averageCompletionRate: 0,
        totalEnrollments: 0,
        completionRate: 0,
        topCourses: [],
      };
    }

    /** 2️⃣ Get enrollment statistics per course */
    const enrollmentStats = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollments')
      .select('course.id', 'courseId')
      .addSelect('COUNT(enrollments.id)', 'enrollmentCount')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isActive = :isActive', { isActive: true })
      .groupBy('course.id')
      .getRawMany();

    // Calculate average enrollment (handle potential lowercase keys from PostgreSQL)
    const totalEnrollments = enrollmentStats.reduce((sum, stat) => {
      const count = parseInt(stat.enrollmentcount || stat.enrollmentCount, 10) || 0;
      return sum + count;
    }, 0);

    // const averageEnrollment =
    //   enrollmentStats.length > 0
    //     ? Math.round((totalEnrollments / enrollmentStats.length) * 10) / 10
    //     : 0;

    // Create enrollment map for quick lookup (handle both cases)
    const enrollmentMap = new Map<string, number>(
      enrollmentStats.map((stat) => {
        const courseId = stat.courseid || stat.courseId;
        const count = parseInt(stat.enrollmentcount || stat.enrollmentCount, 10) || 0;
        return [courseId, count];
      }),
    );

    // Get only courses that have enrollments
    const courseIdsWithEnrollments = enrollmentStats
      .filter((stat) => {
        const count = parseInt(stat.enrollmentcount || stat.enrollmentCount, 10) || 0;
        return count > 0;
      })
      .map((stat) => stat.courseid || stat.courseId);

    //let averageCompletionRate = 0;
    let completionRate = 0; // Changed from averageCompletionRate
    let completionStatsMap = new Map<string, { completed: number; total: number }>();

    // Track global totals for completion rate calculation
    let totalCompletedCoursesGlobal = 0;
    let totalEnrolledStudentsGlobal = 0;

    /** 3️⃣ Calculate completion rate only if there are enrolled students */
    if (courseIdsWithEnrollments.length > 0) {
      // Get total items per course
      const totalItemsQuery = await this.courseSectionItemRepo
        .createQueryBuilder('item')
        .select('course.id', 'courseId')
        .addSelect('COUNT(item.id)', 'totalCount')
        .leftJoin('item.section', 'section')
        .leftJoin('section.course', 'course')
        .where('course.id IN (:...courseIds)', { courseIds: courseIdsWithEnrollments })
        .groupBy('course.id')
        .getRawMany();

      const totalItemsMap = new Map<string, number>(
        totalItemsQuery.map((row) => {
          const courseId = row.courseid || row.courseId;
          const count = parseInt(row.totalcount || row.totalCount, 10) || 0;
          return [courseId, count];
        }),
      );

      // Get student completion data (completed items per courseStudent per course)
      const studentCompletionQuery = await this.progressRepo
        .createQueryBuilder('progress')
        .select('course.id', 'courseId')
        .addSelect('courseStudent.id', 'courseStudentId')
        .addSelect(
          'COUNT(DISTINCT CASE WHEN progress.completed = true THEN item.id END)',
          'completedItems',
        )
        .innerJoin('progress.courseStudent', 'courseStudent')
        .innerJoin('progress.item', 'item')
        .innerJoin('item.section', 'section')
        .innerJoin('section.course', 'course')
        .where('course.id IN (:...courseIds)', { courseIds: courseIdsWithEnrollments })
        .groupBy('course.id')
        .addGroupBy('courseStudent.id')
        .getRawMany();

      // Initialize completion stats for all courses with enrollments
      courseIdsWithEnrollments.forEach((courseId) => {
        const totalStudents = enrollmentMap.get(courseId) || 0;
        completionStatsMap.set(courseId, { completed: 0, total: totalStudents });
      });

      // Count students who completed each course (completed ALL items)
      studentCompletionQuery.forEach((row) => {
        const courseId = row.courseid || row.courseId;
        const totalItemsInCourse = totalItemsMap.get(courseId) || 0;
        const completedItems = parseInt(row.completeditems || row.completedItems, 10) || 0;

        // Student completed the course if they completed all items
        if (totalItemsInCourse > 0 && completedItems >= totalItemsInCourse) {
          const stats = completionStatsMap.get(courseId);
          if (stats) {
            stats.completed += 1;
          }
        }
      });

      // // Calculate average completion rate across all courses with enrollments
      // let totalCompletionRate = 0;
      // let coursesWithEnrollments = 0;

      // completionStatsMap.forEach((stats) => {
      //   if (stats.total > 0) {
      //     const rate = (stats.completed / stats.total) * 100;
      //     totalCompletionRate += rate;
      //     coursesWithEnrollments += 1;
      //   }
      // });

      // averageCompletionRate =
      //   coursesWithEnrollments > 0
      //     ? Math.round((totalCompletionRate / coursesWithEnrollments) * 10) / 10
      //     : 0;

      // 💡 New: Calculate GLOBAL completion rate (Sum of all completions / Sum of all enrollments)
      completionStatsMap.forEach((stats) => {
        totalCompletedCoursesGlobal += stats.completed;
        totalEnrolledStudentsGlobal += stats.total;
      });

      completionRate =
        totalEnrolledStudentsGlobal > 0
          ? Math.round((totalCompletedCoursesGlobal / totalEnrolledStudentsGlobal) * 1000) / 10
          : 0;
    }

    /** 4️⃣ Get top 5 performing courses by enrollment count */
    const topCourses = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollments')
      .select('course.id', 'id')
      .addSelect('course.name', 'name')
      .addSelect('COUNT(enrollments.id)', 'enrollments')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isActive = :isActive', { isActive: true })
      .groupBy('course.id')
      .addGroupBy('course.name')
      .orderBy('enrollments', 'DESC')
      .limit(5)
      .getRawMany();

    // Add completion rate to top courses
    const topCoursesWithCompletion = topCourses.map((course) => {
      const stats = completionStatsMap.get(course.id);
      const completionRate =
        stats && stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

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
      // averageEnrollment,
      // averageCompletionRate,
      totalEnrollments,           // 💡 Returns the total number of enrollments
      completionRate,             // 💡 Returns the platform-wide completion rate
      topCourses: topCoursesWithCompletion,
    };
  }

  async getWeeklySales(): Promise<
    { courseId: string; courseName: string; totalSales: number }[]
  > {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const sales = await this.courseStudentRepo
      .createQueryBuilder('courseStudent')
      .innerJoin('courseStudent.course', 'course')
      .select('course.id', 'courseId')
      .addSelect('course.name', 'courseName')
      .addSelect('COUNT(courseStudent.id)', 'totalsales') // alias in lowercase
      .where('courseStudent.created_at >= :oneWeekAgo', { oneWeekAgo })
      .andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isActive = true')
      .groupBy('course.id')
      .addGroupBy('course.name')
      .orderBy('"totalsales"', 'DESC') // preserve alias casing
      .getRawMany();

    return sales.map((s) => ({
      courseId: s.courseid || s.courseId,
      courseName: s.coursename || s.courseName,
      totalSales: parseInt(s.totalsales || s.totalSales, 10) || 0,
    }));
  }

  async getTopInstructorsAnalytics(limit = 10): Promise<
    {
      instructorId: string;
      name: string;
      photoUrl: string | null;
      totalEnrollments: number;
      averageRating: number;
      totalReviews: number;
      totalCourses: number;
      ranking: number;
    }[]
  > {
    const instructorRoleId = await this.getRoleId('instructor');
    if (!instructorRoleId) return [];

    // Get ALL instructors first
    const allInstructors = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.profile', 'profile')
      .select([
        'user.id',
        'profile.firstName',
        'profile.lastName',
        'profile.photoUrl',
        'profile.averageRating'
      ])
      .where('user.roleId = :roleId', { roleId: instructorRoleId })
      .orderBy('user.created_at', 'DESC')
      .getMany();

    if (allInstructors.length === 0) return [];

    const instructorIds = allInstructors.map(instructor => instructor.id);

    // Get enrollment and course data for these instructors
    const enrollmentResults = await this.courseStudentRepo
      .createQueryBuilder('courseStudent')
      .innerJoin('courseStudent.course', 'course')
      .innerJoin('course.instructor', 'instructor')
      .select('instructor.id', 'instructorId')
      .addSelect('COUNT(DISTINCT courseStudent.id)', 'totalEnrollments')
      .addSelect('COUNT(DISTINCT course.id)', 'totalCourses')
      .where('instructor.id IN (:...instructorIds)', { instructorIds })
      .andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isActive = true')
      .groupBy('instructor.id')
      .getRawMany();

    // Count profile ratings for these instructors
    const ratingCounts = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoin('profile.ratings', 'ratings')
      .innerJoin('profile.user', 'user')
      .select('user.id', 'instructorId')
      .addSelect('COUNT(ratings.id)', 'totalReviews')
      .where('user.id IN (:...instructorIds)', { instructorIds })
      .andWhere('user.roleId = :roleId', { roleId: instructorRoleId })
      .groupBy('user.id')
      .getRawMany();

    // Create maps for quick lookup
    const enrollmentMap = new Map();
    enrollmentResults.forEach(r => {
      enrollmentMap.set(r.instructorid || r.instructorId, {
        totalEnrollments: parseInt(r.totalenrollments || r.totalEnrollments, 10) || 0,
        totalCourses: parseInt(r.totalcourses || r.totalCourses, 10) || 0,
      });
    });

    const ratingCountMap = new Map();
    ratingCounts.forEach(r => {
      ratingCountMap.set(r.instructorid || r.instructorId,
        parseInt(r.totalreviews || r.totalReviews, 10) || 0
      );
    });

    // Combine all data for ALL instructors
    const combinedResults = allInstructors.map((instructor, index) => {
      const enrollmentData = enrollmentMap.get(instructor.id) || {
        totalEnrollments: 0,
        totalCourses: 0,
      };

      // FIX: averageRating is already a number, no need for parseFloat
      const averageRating = instructor.profile.averageRating || 0;
      const roundedRating = Math.round(averageRating * 10) / 10;

      return {
        instructorId: instructor.id,
        name: `${instructor.profile.firstName || ''} ${instructor.profile.lastName || ''}`.trim() || 'Unknown Instructor',
        photoUrl: instructor.profile.photoUrl,
        totalEnrollments: enrollmentData.totalEnrollments,
        totalCourses: enrollmentData.totalCourses,
        totalReviews: ratingCountMap.get(instructor.id) || 0,
        averageRating: roundedRating,
        ranking: index + 1,
      };
    });

    // Sort by totalEnrollments (descending) and apply limit
    return combinedResults
      .sort((a, b) => b.totalEnrollments - a.totalEnrollments)
      .slice(0, limit)
      .map((result, index) => ({
        ...result,
        ranking: index + 1, // Re-rank after sorting
      }));
  }

  /**
 * Calculates the date range for time series stats.
 * @param period 'yearly' (12 months), 'monthly' (4 weeks), 'weekly' (7 days).
 * @returns [startDate, endDate]
 */
  private getDateRange(period: string): [Date, Date] {
    const endDate = new Date();
    const startDate = new Date(endDate);

    switch (period) {
      case 'yearly':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'monthly': // Last 4 weeks
        startDate.setDate(endDate.getDate() - 28);
        break;
      case 'weekly': // Last 7 days
        startDate.setDate(endDate.getDate() - 7);
        break;
      default:
        // Default to yearly for safety
        startDate.setFullYear(endDate.getFullYear() - 1);
    }
    return [startDate, endDate];
  }

  async getTimeSeriesStats(period: string, type: string): Promise<any> {
    const [startDate, endDate] = this.getDateRange(period);

    let roleId: string | null = null;
    let alias: string;
    let repo: Repository<any>;

    // 1. Determine Repository and Entity alias based on type
    switch (type) {
      case 'courses':
        alias = 'course';
        repo = this.courseRepository;
        break;
      case 'students':
        roleId = await this.getRoleId('student');
        if (!roleId) return [];
        alias = 'user';
        repo = this.userRepository;
        break;
      case 'instructors':
        roleId = await this.getRoleId('instructor');
        if (!roleId) return [];
        alias = 'user';
        repo = this.userRepository;
        break;
      case 'enrollments': // ✅ NEW CASE FOR ENROLLMENTS
        alias = 'enrollment';
        repo = this.courseStudentRepo; // Use the CourseStudent repository
        break;
      case 'academies':
        alias = 'academy';
        repo = this.academyRepository;
        break;
      case 'payments':
        alias = 'payment';
        repo = this.paymentRepository;
        break;
      default:
        return [];
    }

    // 2. Determine date part for grouping (e.g., DAY, WEEK, MONTH)
    let datePart: string;
    if (period === 'weekly') {
      datePart = 'DAY';
    } else if (period === 'monthly') {
      datePart = 'WEEK'; // Group by week for a 4-week span
    } else { // yearly
      datePart = 'MONTH';
    }

    // 3. Build the dynamic query
    let query = repo
      .createQueryBuilder(alias)
      // FIX 1: Use AT TIME ZONE 'UTC' to standardize the time before truncation.
      // This is the most likely cause of month-off errors due to timezone/DST shifts.
      .select(`DATE_TRUNC('${datePart}', ${alias}.created_at AT TIME ZONE 'UTC')`, 'date_group')
      .addSelect(`COUNT(${alias}.id)`, 'count')
      // FIX 2: Apply the endDate filter inclusively (or adjust it)
      .where(`${alias}.created_at >= :startDate`, { startDate })
      .andWhere(`${alias}.created_at < :endDate`, {
        // Use '<' instead of '<=' and set endDate to midnight of the *next* day, 
        // or rely on the date object boundary. We'll use the original endDate object 
        // but ensure the application date is correctly set to end-of-day for the filter.
        endDate
      })
      .groupBy('date_group')
      .orderBy('date_group', 'ASC');

    // Add role filtering for Users (Students/Instructors)
    if (roleId) {
      query = query.andWhere(`${alias}.roleId = :roleId`, { roleId });
    }

    // Add status filtering for Courses
    if (type === 'courses') {
      query = query
        .andWhere(`${alias}.status = :status`, { status: CourseStatus.PUBLISHED })
        .andWhere(`${alias}.isActive = :isActive`, { isActive: true });
    }

    if (type === 'payments') {
      query = query
        .andWhere(`${alias}.status = :status`, { status: PaymentStatus.SUCCESS });
    }

    // Execute the query
    const rawResults = await query.getRawMany();

    // 4. Format the output (fill in missing dates/groups with count 0)
    // This part is crucial to match the chart's expectation (like your image)
    return this.formatTimeSeriesData(rawResults, startDate, endDate, datePart);
  }

  // --- AdminService (New Formatting Utility) ---

  private formatTimeSeriesData(rawResults: any[], startDate: Date, endDate: Date, datePart: string): { date: string, count: number }[] {
    const formattedData = rawResults.map(r => ({
      date: new Date(r.date_group).toISOString().split('T')[0], // YYYY-MM-DD
      count: parseInt(r.count, 10),
    }));

    // This helper logic would ensure all intermediate periods (months, weeks, days) 
    // within the range are present, even if count is 0, for proper chart display.
    // However, implementing full date padding logic here is complex. 
    // For a minimal implementation, we return the raw grouped data:
    return formattedData;
  }

  /**
   * Admin function to list all submissions, optionally filtered by status.
   */
  async listIdentitySubmissions(status?: IdentityVerificationStatus): Promise<IdentityVerification[]> {
    const where = status ? { status } : {};
    return this.identityRepository.find({
      where,
      relations: ['user', 'user.profile'], // Fetch user details for display
      order: { created_at: 'DESC' }
    });
  }

  /**
   * Admin function to approve a submission and update user status.
   */
  async approveIdentitySubmission(submissionId: string, reviewerId: string): Promise<IdentityVerification> {
    const submission = await this.identityRepository.findOne({
      where: { id: submissionId },
      relations: ['user'],
    });

    if (!submission) {
      throw new NotFoundException('Identity submission not found.');
    }
    if (submission.status === IdentityVerificationStatus.APPROVED) {
      throw new BadRequestException('Submission is already approved.');
    }

    // 1. Update submission status
    submission.status = IdentityVerificationStatus.APPROVED;
    submission.rejectionReason = null; // Clear rejection reason if re-approved
    submission.reviewedBy = { id: reviewerId } as User;
    const approvedSubmission = await this.identityRepository.save(submission);

    // 2. Update user verification status
    const user = submission.user;
    if (!user) {
      throw new NotFoundException('User associated with submission not found.');
    }

    user.isIdentityVerified = true;
    // Set overall verified status: true only if email is also verified
    user.isVerified = user.isEmailVerified && user.isIdentityVerified;

    await this.userRepository.save(user);

    return approvedSubmission;
  }

  /**
   * Admin function to reject a submission and update user status.
   */
  async rejectIdentitySubmission(
    submissionId: string,
    rejectionReason: string,
    reviewerId: string,
  ): Promise<IdentityVerification> {
    const submission = await this.identityRepository.findOne({
      where: { id: submissionId },
      relations: ['user'],
    });

    if (!submission) {
      throw new NotFoundException('Identity submission not found.');
    }
    if (submission.status === IdentityVerificationStatus.REJECTED) {
      throw new BadRequestException('Submission is already rejected.');
    }

    // 1. Update submission status and reason
    submission.status = IdentityVerificationStatus.REJECTED;
    submission.rejectionReason = rejectionReason;
    submission.reviewedBy = { id: reviewerId } as User;
    const rejectedSubmission = await this.identityRepository.save(submission);

    // 2. Update user verification status to false
    const user = submission.user;
    if (!user) {
      throw new NotFoundException('User associated with submission not found.');
    }

    user.isIdentityVerified = false;
    user.isVerified = false; // Rejection implies overall verification is false

    await this.userRepository.save(user);

    return rejectedSubmission;
  }

  /**
   * Admin function to manually set the overall isVerified status.
   */
  async adminSetIsVerified(userId: string, isVerified: boolean): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Admin override logic: set the final flag directly
    user.isVerified = isVerified;

    return this.userRepository.save(user);
  }

  /** ----------------- INSTRUCTOR LISTING ----------------- */
  async getAllInstructors(page = 1, limit = 10, search?: string): Promise<any> {
    const instructorRoleId = await this.getRoleId('instructor');
    if (!instructorRoleId) {
      // Return a standard empty structure
      return { instructors: [], pagination: this.paginationMeta(1, limit, 0) };
    }

    const pageNum = Math.max(1, parseInt(page + '', 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit + '', 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.identityVerification', 'identityVerification')
      .where('user.roleId = :roleId', { roleId: instructorRoleId });

    // 🔍 Apply search filter if a term is provided
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      query = query.andWhere(
        // Search by first name OR last name OR email
        `(LOWER(profile.firstName) LIKE :searchTerm OR LOWER(profile.lastName) LIKE :searchTerm OR LOWER(user.email) LIKE :searchTerm)`,
        { searchTerm },
      );
    }

    // Get the full User and Profile entities
    const [instructors, total] = await query
      .orderBy('user.created_at', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount(); // getManyAndCount fetches all selected fields

    // Return the full entity data and pagination metadata
    return {
      instructors: instructors.map((i) => ({
        ...i,
        profile: i.profile ? { ...i.profile } : null,
        verificationStatus: i.identityVerification?.status ?? null,
      })),
      pagination: this.paginationMeta(pageNum, limitNum, total),
    };
  }

  // -----------------------------------------------------------------
  // 🟢 1. STUDENT DASHBOARD OVERVIEW (SECTION 1)
  // -----------------------------------------------------------------
  async getStudentOverviewStats(period: string): Promise<any> {
    // Execute time-series for students and global counts in parallel
    const [timeSeriesData, totalStudents, totalCourses, totalEnrollments] = await Promise.all([
      // Reusing existing getTimeSeriesStats method with type 'students'
      this.getTimeSeriesStats(period, 'students'),
      // Total Students (assuming published/active status is counted)
      this.userRepository.count({ where: { role: { name: 'student' } } }),
      // Total Courses (assuming only published active courses)
      this.courseRepository.count({
        where: { status: 'published' as any, isActive: true },
      }),
      // Total Enrollments (CourseStudent count)
      this.courseStudentRepo.count(),
    ]);

    return {
      totalStudents,
      totalCourses,
      totalEnrollments,
      timeSeries: timeSeriesData,
    };
  }

  // -----------------------------------------------------------------
  // 🟢 2. STUDENT GEOGRAPHIC STATS (SECTION 2)
  // -----------------------------------------------------------------
  async getStudentGeoStats(): Promise<any> {
    const studentRoleId = await this.getRoleId('student');
    if (!studentRoleId) return [];

    // Assuming this counts all students needed for the percentage denominator
    const totalStudents = await this.userRepository.count({ where: { role: { id: studentRoleId } } });

    // 1. Define the alias as all lowercase: 'studentcount'
    const GEO_COUNT_ALIAS = 'studentcount';

    const geoStats = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoin('profile.user', 'user')
      .select('profile.country', 'country')
      // ✅ FIX 1: Use a clean, lowercase alias in addSelect
      .addSelect('COUNT(user.id)', GEO_COUNT_ALIAS)
      .where('user.roleId = :roleId', { roleId: studentRoleId })
      .andWhere('profile.country IS NOT NULL')
      .groupBy('profile.country')
      // ✅ FIX 2: Use the exact lowercase alias in orderBy
      // This is necessary because TypeORM won't quote it if it's all lowercase.
      .orderBy(GEO_COUNT_ALIAS, 'DESC')
      .getRawMany();

    return geoStats.map(stat => ({
      country: stat.country,
      // ✅ FIX 3: Access the property as all lowercase
      students: parseInt(stat[GEO_COUNT_ALIAS], 10),
      percentage: totalStudents > 0 ?
        Math.round((parseInt(stat[GEO_COUNT_ALIAS], 10) / totalStudents) * 1000) / 10 : 0,
    }));
  }

  // -----------------------------------------------------------------
  // 🟢 3. MODIFIED: DETAILED STUDENTS LIST (SECTION 3) - CORRECTION
  // -----------------------------------------------------------------
  async getAllStudentsInformation(
    page = 1,
    limit = 10,
    search?: string,
    minAge?: number,
    maxAge?: number,
    gender?: GenderFilter,
    category?: string,
    speciality?: string,
  ): Promise<any> {

    const studentRoleId = await this.getRoleId('student');
    if (!studentRoleId) {
      return { students: [], pagination: this.paginationMeta(1, limit, 0) };
    }

    const pageNum = Math.max(1, parseInt(page + '', 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit + '', 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('profile.category', 'category') // Join to ProfileCategory
      .leftJoinAndSelect('profile.speciality', 'speciality') // Join to ProfileSpeciality
      // 🛑 Removed: .leftJoin(CourseStudent, 'cs', 'cs.student_id = user.id') 
      .where('user.roleId = :roleId', { roleId: studentRoleId })
      // 🛑 Removed: .groupBy('user.id, profile.id, category.id, speciality.id') 
      .orderBy('user.created_at', 'DESC') // Ordering is now part of the main query
      .offset(skip)
      .limit(limitNum);

    // 🔍 1. Search Filter (by name/email)
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      query = query.andWhere(
        `(LOWER(profile.firstName) LIKE :searchTerm OR LOWER(profile.lastName) LIKE :searchTerm OR LOWER(user.email) LIKE :searchTerm)`,
        { searchTerm },
      );
    }

    // Helper function to calculate DOB based on age
    const getDateOfBirth = (age: number, isMin: boolean) => {
      const today = new Date();
      const year = today.getFullYear() - age;
      // Use precise dates for month/day boundaries
      return new Date(year, isMin ? 11 : 0, isMin ? 31 : 1);
    };

    // 👴 2. Age Filter (based on date_of_birth in Profile)
    if (minAge !== undefined) {
      const maxDOB = getDateOfBirth(minAge, true); // Older than minAge means DOB is before maxDOB
      query = query.andWhere('profile.dateOfBirth <= :maxDOB', { maxDOB });
    }
    if (maxAge !== undefined) {
      const minDOB = getDateOfBirth(maxAge, false); // Younger than maxAge means DOB is after minDOB
      query = query.andWhere('profile.dateOfBirth >= :minDOB', { minDOB });
    }

    // 🚻 3. Gender Filter
    if (gender && gender.toLowerCase() !== 'all') {
      // Use the simpler column name (TypeORM handles case) and rely on the database value
      query = query.andWhere('profile.gender = :gender', { gender: gender.toLowerCase() });
    }

    // 🏷️ 4. Category Filter
    if (category) {
      query = query.andWhere('(category.name ILIKE :category OR category.id = :category)', { category: `%${category}%` });
    }

    // ⭐️ 5. Speciality Filter
    if (speciality) {
      query = query.andWhere('(speciality.name ILIKE :speciality OR speciality.id = :speciality)', { speciality: `%${speciality}%` });
    }

    // 🛑 EXECUTION: Use getManyAndCount to get both results and total count efficiently
    const [users, total] = await query.getManyAndCount();

    // 6. Final Mapping (No longer uses raw results, so it's much cleaner)
    const students = users.map(user => {
      // Calculate age from date_of_birth (if available)
      const age = user.profile?.dateOfBirth
        ? Math.floor((new Date().getTime() - new Date(user.profile.dateOfBirth).getTime()) / 3.15576e+10)
        : null;

      return {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        profile: {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          fullName: `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || 'N/A',
          photoUrl: user.profile.photoUrl,
          country: user.profile.country, // Assuming these are loaded relations/objects
          state: user.profile.state,     // Assuming these are loaded relations/objects
          dateOfBirth: user.profile.dateOfBirth,
          gender: user.profile.gender,
          age: age, // Calculated age
          category: user.profile.category || null,
          speciality: user.profile.speciality || null,
        },
        // Enrollment data removed from the query, so it's not mapped
      };
    });

    return {
      students,
      pagination: this.paginationMeta(pageNum, limitNum, total),
    };
  }

  /** ----------------- QUIZ LISTING FOR ADMIN ----------------- */
  async getAllQuizzesForAdmin(page = 1, limit = 10, search?: string): Promise<any> {
    const pageNum = Math.max(1, parseInt(page + '', 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit + '', 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const quizAlias = 'quiz';

    // 1. DEFINE LIST QUERY (without pagination applied yet)
    let listQueryBase = this.quizRepository
      .createQueryBuilder(quizAlias)
      .leftJoin(`${quizAlias}.instructor`, 'instructor')
      .leftJoin('instructor.profile', 'profile')
      .leftJoin('quiz_questions', 'qq', `qq.quiz_id = ${quizAlias}.id`)
      .leftJoin(QuizAttempt, 'attempt', `attempt.quiz_id = ${quizAlias}.id`)
      .select([
        `${quizAlias}.id AS id`,
        `${quizAlias}.title AS title`,
        `${quizAlias}.created_at AS date`,
        `${quizAlias}.status AS status`,
        `CONCAT(COALESCE(profile.firstName, ''), ' ', COALESCE(profile.lastName, '')) AS instructorName`,
        `profile.photoUrl AS instructorPhotoUrl`,
        `COUNT(DISTINCT qq.question_id) AS totalQuestions`,
        `COUNT(DISTINCT attempt.id) AS totalEnrollments`,
      ])
      .groupBy(`${quizAlias}.id, ${quizAlias}.title, ${quizAlias}.created_at, ${quizAlias}.status, instructorName, instructorPhotoUrl`);

    // Apply Search Filter to the base query
    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      listQueryBase = listQueryBase.andWhere(
        `(LOWER(${quizAlias}.title) LIKE :searchTerm OR LOWER(profile.firstName) LIKE :searchTerm OR LOWER(profile.lastName) LIKE :searchTerm)`,
        { searchTerm },
      );
    }

    // 2. ASSEMBLE PROMISES (run all necessary queries in parallel)
    const [
      totalQuizzes,
      totalEnrollments,
      totalQuestions,
      totalFilteredQuizzes, // Count of quizzes AFTER applying the search filter
      rawResults,
    ] = await Promise.all([
      // Global Overview Stats
      this.quizRepository.count({ where: { status: 'published' as any } }),
      this.quizAttemptRepository.count(),
      this.questionRepository.count(),
      // Count and Fetch the Filtered List Data
      listQueryBase.getCount(), // Count total items matching the search filter
      listQueryBase
        .orderBy(`${quizAlias}.created_at`, 'DESC')
        .offset(skip)
        .limit(limitNum)
        .getRawMany(),
    ]);

    // 3. FORMAT LIST RESULTS
    const quizzes = rawResults.map((r, index) => ({
      id: r.id,
      title: r.title,
      instructorName: r.instructorname?.trim() || 'N/A',
      instructorPhotoUrl: r.instructorphotourl,
      date: this.formatDate(r.date),
      totalQuestions: parseInt(r.totalquestions) || 0,
      isActive: r.status === 'published',
      status: r.status,
      totalEnrollments: parseInt(r.totalenrollments) || 0,
    }));

    // 4. RETURN COMBINED OBJECT
    return {
      // Overview Stats
      totalQuizzes,
      totalEnrollments,
      totalQuestions,
      // List Data
      quizzes,
      pagination: this.paginationMeta(pageNum, limitNum, totalFilteredQuizzes), // Use the filtered total for pagination
    };
  }

  // ============================================
  // Service Method - Add to AdminService
  // ============================================
  async getEnrollmentsOverview(period: string): Promise<any> {
    try {
      const now = new Date();
      // Assume startOfMonth and lastMonthRange helpers exist
      const startOfMonth = this.startOfMonth(now);
      const [startOfLastMonth, endOfLastMonth] = this.lastMonthRange(now);

      // 1️⃣ Get counts and time series in parallel
      const [
        totalEnrollments,
        thisMonthEnrollments,
        lastMonthEnrollments,
        enrollmentTimeSeries, // ✅ NEW: Time series data
      ] = await Promise.all([
        this.courseStudentRepo.count(),

        this.courseStudentRepo
          .createQueryBuilder('cs')
          .where('cs.created_at >= :startOfMonth', { startOfMonth })
          .getCount(),

        this.courseStudentRepo
          .createQueryBuilder('cs')
          .where('cs.created_at BETWEEN :startOfLastMonth AND :endOfLastMonth', {
            startOfLastMonth,
            endOfLastMonth,
          })
          .getCount(),

        // ✅ NEW: Execute the time series stats call
        this.getTimeSeriesStats(period, 'enrollments'),
      ]);

      // Early return if no enrollments
      if (totalEnrollments === 0) {
        return {
          totalEnrollments: 0,
          activeEnrollments: 0,
          completedEnrollments: 0,
          thisMonthEnrollments: 0,
          enrollmentRate: 0,
          enrollmentTimeSeries: [], // Include the key for consistency
        };
      }

      // 2️⃣ Get total items per course and progress data in parallel
      const [totalItemsPerCourse, progressPerEnrollment] = await Promise.all([
        // Total items in each course
        this.courseSectionItemRepo
          .createQueryBuilder('item')
          .select('course.id', 'courseId')
          .addSelect('COUNT(item.id)', 'totalItems')
          .innerJoin('item.section', 'section')
          .innerJoin('section.course', 'course')
          .groupBy('course.id')
          .getRawMany(),

        // Completed items per enrollment
        this.progressRepo
          .createQueryBuilder('progress')
          .select('courseStudent.id', 'courseStudentId')
          .addSelect('course.id', 'courseId')
          .addSelect(
            'COUNT(DISTINCT CASE WHEN progress.completed = true THEN item.id END)',
            'completedItems',
          )
          .innerJoin('progress.courseStudent', 'courseStudent')
          .innerJoin('progress.item', 'item')
          .innerJoin('item.section', 'section')
          .innerJoin('section.course', 'course')
          .groupBy('courseStudent.id')
          .addGroupBy('course.id')
          .getRawMany(),
      ]);

      // 3️⃣ Build course total items map
      const totalItemsMap = new Map<string, number>(
        totalItemsPerCourse.map((row) => [
          row.courseid || row.courseId,
          parseInt(row.totalitems || row.totalItems, 10) || 0,
        ]),
      );

      // 4️⃣ Track which enrollments have progress
      const enrollmentsWithProgress = new Set<string>();
      let activeEnrollments = 0;
      let completedEnrollments = 0;

      progressPerEnrollment.forEach((row) => {
        const courseStudentId = row.coursestudentid || row.courseStudentId;
        const courseId = row.courseid || row.courseId;
        const completedItems = parseInt(row.completeditems || row.completedItems, 10) || 0;
        const totalItems = totalItemsMap.get(courseId) || 0;

        enrollmentsWithProgress.add(courseStudentId);

        if (completedItems > 0) {
          if (totalItems > 0 && completedItems >= totalItems) {
            // All items completed
            completedEnrollments += 1;
          } else {
            // Some items completed (active)
            activeEnrollments += 1;
          }
        }
      });

      // 6️⃣ Calculate enrollment rate (month-over-month)
      const enrollmentRate = this.calcPercentChange(thisMonthEnrollments, lastMonthEnrollments);

      // 7️⃣ Return the final object including the time series data
      return {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        thisMonthEnrollments,
        enrollmentRate,
        enrollmentTimeSeries, // ✅ Final result
      };
    } catch (error) {
      console.error('Failed to fetch enrollments overview', error.stack);
      throw error;
    }
  }

  async getAllEnrollments(
    page = 1,
    limit = 10,
    search?: string,
    status?: EnrollmentStatus,
    startDate?: Date,
    endDate?: Date,
  ): Promise<EnrollmentsListResponseDto> {
    try {
      const pageNum = Math.max(1, parseInt(page + '', 10) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit + '', 10) || 10), 100);
      const skip = (pageNum - 1) * limitNum;

      // 1️⃣ Build base query with all necessary joins
      let query = this.courseStudentRepo
        .createQueryBuilder('cs')
        .leftJoinAndSelect('cs.student', 'student')
        .leftJoinAndSelect('student.profile', 'studentProfile')
        .leftJoinAndSelect('cs.course', 'course')
        .leftJoinAndSelect('course.instructor', 'instructor')
        .leftJoinAndSelect('instructor.profile', 'instructorProfile')
        .leftJoinAndSelect('course.pricings', 'pricing')
        .where('course.status = :status', { status: CourseStatus.PUBLISHED })
        .orderBy('cs.created_at', 'DESC');

      // 2️⃣ Search filter (student name, email, or course name)
      if (search) {
        const searchTerm = `%${search.toLowerCase()}%`;
        query = query.andWhere(
          `(
          LOWER(studentProfile.first_name) LIKE :searchTerm OR 
          LOWER(studentProfile.last_name) LIKE :searchTerm OR 
          LOWER(student.email) LIKE :searchTerm OR 
          LOWER(course.name) LIKE :searchTerm
        )`,
          { searchTerm },
        );
      }

      // 3️⃣ Date range filter
      if (startDate) {
        query = query.andWhere('cs.created_at >= :startDate', { startDate });
      }
      if (endDate) {
        // Set to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.andWhere('cs.created_at <= :endDate', { endDate: endOfDay });
      }

      // 4️⃣ Get total count and paginated results
      const [enrollments, total] = await query
        .skip(skip)
        .take(limitNum)
        .getManyAndCount();

      // Early return if no enrollments
      if (enrollments.length === 0) {
        return {
          enrollments: [],
          pagination: this.paginationMeta(pageNum, limitNum, 0),
        };
      }

      // 5️⃣ Get course IDs and enrollment IDs for progress calculation
      const courseIds = [...new Set(enrollments.map(e => e.course.id))];
      const enrollmentIds = enrollments.map(e => e.id);

      // 6️⃣ Get total items per course
      const totalItemsQuery = await this.courseSectionItemRepo
        .createQueryBuilder('item')
        .select('course.id', 'courseId')
        .addSelect('COUNT(item.id)', 'totalItems')
        .innerJoin('item.section', 'section')
        .innerJoin('section.course', 'course')
        .where('course.id IN (:...courseIds)', { courseIds })
        .groupBy('course.id')
        .getRawMany();

      const totalItemsMap = new Map<string, number>(
        totalItemsQuery.map(row => [
          row.courseid || row.courseId,
          parseInt(row.totalitems || row.totalItems, 10) || 0,
        ]),
      );

      // 7️⃣ Get completed items per enrollment
      const progressQuery = await this.progressRepo
        .createQueryBuilder('progress')
        .select('courseStudent.id', 'enrollmentId')
        .addSelect('course.id', 'courseId')
        .addSelect(
          'COUNT(DISTINCT CASE WHEN progress.completed = true THEN item.id END)',
          'completedItems',
        )
        .innerJoin('progress.courseStudent', 'courseStudent')
        .innerJoin('progress.item', 'item')
        .innerJoin('item.section', 'section')
        .innerJoin('section.course', 'course')
        .where('courseStudent.id IN (:...enrollmentIds)', { enrollmentIds })
        .groupBy('courseStudent.id')
        .addGroupBy('course.id')
        .getRawMany();

      const progressMap = new Map<string, { completed: number; total: number }>();

      progressQuery.forEach(row => {
        const enrollmentId = row.enrollmentid || row.enrollmentId;
        const courseId = row.courseid || row.courseId;
        const completedItems = parseInt(row.completeditems || row.completedItems, 10) || 0;
        const totalItems = totalItemsMap.get(courseId) || 0;

        progressMap.set(enrollmentId, {
          completed: completedItems,
          total: totalItems,
        });
      });

      // 8️⃣ Build enrollment details with status classification
      const enrollmentDetails: EnrollmentDetailDto[] = [];

      for (const enrollment of enrollments) {
        const progressData = progressMap.get(enrollment.id);
        const completedItems = progressData?.completed || 0;
        const totalItems = progressData?.total || 0;

        // Calculate progress percentage
        const progress = totalItems > 0
          ? Math.round((completedItems / totalItems) * 1000) / 10
          : 0;

        // Determine status
        let enrollmentStatus: string;
        if (totalItems > 0 && completedItems >= totalItems) {
          enrollmentStatus = EnrollmentStatus.COMPLETED;
        } else if (completedItems > 0) {
          enrollmentStatus = EnrollmentStatus.ACTIVE;
        } else {
          enrollmentStatus = EnrollmentStatus.INACTIVE;
        }

        // Filter by status if provided
        if (status && status !== EnrollmentStatus.ALL && enrollmentStatus !== status) {
          continue; // Skip this enrollment
        }

        // Get student name
        const studentName = enrollment.student?.profile
          ? `${enrollment.student.profile.firstName || ''} ${enrollment.student.profile.lastName || ''}`.trim()
          : 'N/A';

        // Get instructor name
        const instructorName = enrollment.course?.instructor?.profile
          ? `${enrollment.course.instructor.profile.firstName || ''} ${enrollment.course.instructor.profile.lastName || ''}`.trim()
          : 'N/A';

        // Get price (first pricing or null)
        const price = enrollment.course?.pricings?.[0]?.salePrice || null;

        enrollmentDetails.push({
          enrollmentId: enrollment.id,
          studentName,
          studentEmail: enrollment.student?.email || 'N/A',
          courseId: enrollment.course?.id || null,
          courseName: enrollment.course?.name || 'N/A',
          enrollmentDate: enrollment.created_at?.toISOString() || null,
          status: enrollmentStatus,
          progress,
          instructorName,
          price,
          completedItems,
          totalItems,
        });
      }

      // 9️⃣ Return paginated results
      return {
        enrollments: enrollmentDetails,
        pagination: this.paginationMeta(pageNum, limitNum, total),
      };
    } catch (error) {
      console.error('Failed to fetch enrollments', error.stack);
      throw error;
    }
  }

  async createStudent(
    createStudentDto: CreateStudentDto,
  ): Promise<User> {
    const { password, firstName, lastName, email, phoneNumber, courseIds } =
      createStudentDto;

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Declare createdUser outside the transaction to hold the final result
    let createdUser: User;

    await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const profileRepository = manager.getRepository(Profile);
      const courseRepository = manager.getRepository(Course);
      const courseStudentRepo = manager.getRepository(CourseStudent);

      // 1. Check for existing user email AND get role in parallel
      const [existingUser, roleEntity] = await Promise.all([
        userRepository.findOne({
          where: { email: normalizedEmail },
          select: ['id'],
        }),
        manager.getRepository(Role).findOne({
          where: { name: 'student' },
          cache: true,
        }),
      ]);

      if (existingUser) {
        throw new BadRequestException('Email address is already in use.');
      }

      if (!roleEntity) {
        throw new InternalServerErrorException('Student role not found in the system.');
      }

      // 2. Create User Entity
      const verificationToken = uuidv4();
      let newUser = userRepository.create({
        email: normalizedEmail,
        password: hashedPassword,
        role: roleEntity,
        isEmailVerified: false,
        isVerified: false,
        emailVerificationToken: verificationToken,
      });
      // Use `manager.save` for entities created within a transaction
      newUser = await manager.save(newUser);

      // 3. Create Profile Entity
      // (Assuming profileService methods are now imported utilities or injected)
      let userName = this.profileService.generateUsername(firstName, lastName);

      const candidateUsernames = Array.from({ length: 5 }, () =>
        this.profileService.generateUsername(firstName, lastName)
      );

      const existingProfiles = await profileRepository.find({
        where: { userName: In(candidateUsernames) },
        select: ['userName'],
      });

      const takenUsernames = new Set(existingProfiles.map(p => p.userName));
      const availableUserName = candidateUsernames.find(u => !takenUsernames.has(u));

      if (!availableUserName) {
        throw new BadRequestException('Could not generate a unique username.');
      }

      const newProfile = profileRepository.create({
        firstName,
        lastName,
        userName,
        phoneNumber,
        isPublic: false,
        user: newUser,
      });

      newProfile.completionPercentage = this.profileService.calculateCompletion(newProfile);
      await manager.save(newProfile);

      // Link profile back to user object for the final return (optional, but good)
      newUser.profile = newProfile;


      // 4. Enrollments (if courseIds are provided)
      if (courseIds && courseIds.length > 0) {
        const validCourses = await courseRepository.find({
          where: { id: In(courseIds) },
          select: ['id', 'status'],
        });

        const foundIds = validCourses.map((c) => c.id);
        const invalidIds = courseIds.filter((id) => !foundIds.includes(id));

        if (invalidIds.length > 0) {
          throw new BadRequestException(`The following Course IDs are invalid: ${invalidIds.join(', ')}`);
        }

        const enrollments = validCourses.map((course) =>
          courseStudentRepo.create({
            student: newUser,
            course: course,
          }),
        );
        await manager.save(enrollments);
      }

      // 5. Assign the fully created user to the outer variable
      createdUser = newUser;
      // The transaction block implicitly returns `void` here, which is fine
    }); // End of transaction block

    // 6. Send Welcome Email with Credentials (OUTSIDE the transaction)
    // Check if the user was successfully created before sending the email
    if (createdUser) {
      try {
        const nameToSend = createdUser.profile.firstName || createdUser.email;

        await this.emailService.sendEmail({
          from: process.env.SMTP_DEMO_EMAIL,
          to: createdUser.email,
          subject: 'Welcome to Medicova - Your Account Credentials',
          template: 'welcome-admin-created',
          context: {
            name: nameToSend,
            email: createdUser.email,
            password: password, // The original plaintext password
          },
        });
      } catch (emailError) {
        console.error('Failed to send admin-created welcome email:', emailError);
        // Fail silently on email error, but log it.
      }
    }

    // 7. Return the created user entity (making the function return Promise<User>)
    return createdUser;
  }

  async createInstructor(
    createInstructorDto: CreateInstructorDto,
  ): Promise<User> {
    const {
      email,
      password,
      firstName,
      lastName,
      userName,
      photoUrl,
      phoneNumber,
      country,
      state,
      city,
    } = createInstructorDto;

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    let createdInstructor: User;

    await this.dataSource.transaction(async (manager) => {
      const userRepository = manager.getRepository(User);
      const profileRepository = manager.getRepository(Profile);
      const roleRepository = manager.getRepository(Role);

      // 1. Check for existing user email and get instructor role
      const [existingUser, roleEntity] = await Promise.all([
        userRepository.findOne({
          where: { email: normalizedEmail },
          select: ['id'],
        }),
        roleRepository.findOne({
          where: { name: 'instructor' },
          cache: true,
        }),
      ]);

      if (existingUser) {
        throw new BadRequestException('Email address is already in use.');
      }

      if (!roleEntity) {
        throw new InternalServerErrorException('Instructor role not found in the system.');
      }

      // 2. Create User Entity
      const verificationToken = uuidv4();
      let newUser = userRepository.create({
        email: normalizedEmail,
        password: hashedPassword,
        role: roleEntity,
        isEmailVerified: false,
        isVerified: false,
        emailVerificationToken: verificationToken,
      });

      newUser = await manager.save(newUser);

      // 3. Generate or validate username
      let finalUserName = userName;
      if (!finalUserName) {
        finalUserName = this.profileService.generateUsername(firstName, lastName);

        // Ensure username is unique
        const candidateUsernames = Array.from({ length: 5 }, () =>
          this.profileService.generateUsername(firstName, lastName)
        );

        const existingProfiles = await profileRepository.find({
          where: { userName: In(candidateUsernames) },
          select: ['userName'],
        });

        const takenUsernames = new Set(existingProfiles.map(p => p.userName));
        const availableUserName = candidateUsernames.find(u => !takenUsernames.has(u));

        if (!availableUserName) {
          throw new BadRequestException('Could not generate a unique username.');
        }
        finalUserName = availableUserName;
      } else {
        // Check if provided username is unique
        const existingWithUsername = await profileRepository.findOne({
          where: { userName: finalUserName },
        });

        if (existingWithUsername) {
          throw new BadRequestException('Username is already taken.');
        }
      }

      // 5. Create Profile Entity
      const newProfile = profileRepository.create({
        user: newUser,
        firstName,
        lastName,
        userName: finalUserName,
        photoUrl,
        phoneNumber,
        country,
        state,
        city,
        contactEmail: normalizedEmail, // Use email as contact email
        isPublic: true, // Instructors are public by default
        averageRating: 0,
        completionPercentage: 0,
      });

      // Calculate completion percentage
      newProfile.completionPercentage = this.profileService.calculateCompletion(newProfile);
      await manager.save(newProfile);

      // Link profile back to user
      newUser.profile = newProfile;

      // 6. Assign the created user to the outer variable
      createdInstructor = newUser;
    });

    // 7. Send Welcome Email (outside transaction)
    if (createdInstructor) {
      try {
        const nameToSend = createdInstructor.profile.firstName || createdInstructor.email;

        await this.emailService.sendEmail({
          from: process.env.SMTP_DEMO_EMAIL,
          to: createdInstructor.email,
          subject: 'Welcome to Medicova - Your Instructor Account',
          template: 'welcome-admin-created',
          context: {
            name: nameToSend,
            email: createdInstructor.email,
            password: password, // The original plaintext password
          },
        });
      } catch (emailError) {
        console.error('Failed to send instructor welcome email:', emailError);
        // Fail silently on email error, but log it
      }
    }

    return createdInstructor;
  }

  /**
     * Admin submits a rating and review for a course on behalf of a student (user).
     */
  async adminRateCourse(
    courseId: string,
    studentId: string, // Corresponds to the User entity ID
    rating: number,
    review?: string,
  ): Promise<CourseRating> {
    // 1. Check for existing rating (prevents duplicate based on @Unique(['course', 'user']))
    const existingRating = await this.ratingRepo.findOne({
      // We check against the foreign keys
      where: { course: { id: courseId }, user: { id: studentId }, deleted_at: null },
    });

    if (existingRating) {
      throw new BadRequestException(
        `Student ${studentId} has already submitted a rating for course ${courseId}.`,
      );
    }

    // 2. Create the new rating record
    const newRating = this.ratingRepo.create({
      // Use IDs for creating the relationship
      course: { id: courseId } as Course,
      user: { id: studentId } as User, // Assuming User entity has 'id'
      rating,
      review,
    });

    let savedRating: CourseRating;

    // Use a transaction to ensure rating creation and course update are atomic
    await this.dataSource.transaction(async (manager) => {
      // Save the new rating
      savedRating = await manager.save(CourseRating, newRating);

      // 3. Update Course Stats (Aggregate New Average Rating and Review Count)

      // Query the 'course_ratings' table to get the total count and sum of all ratings
      const rawStats = await manager
        .createQueryBuilder(CourseRating, 'rating')
        .select('COUNT(rating.id)', 'count')
        .addSelect('SUM(rating.rating)', 'sum')
        .where('rating.course_id = :courseId', { courseId }) // Assuming direct courseId column on table
        .andWhere('rating.deleted_at IS NULL')
        .getRawOne();

      const totalRatings = parseInt(rawStats.count, 10);
      const totalRatingSum = parseFloat(rawStats.sum);

      const newAverageRating = totalRatings > 0
        ? parseFloat((totalRatingSum / totalRatings).toFixed(2))
        : 0;

      // Update the Course entity
      const updateResult = await manager
        .createQueryBuilder()
        .update(Course)
        .set({
          averageRating: newAverageRating,
          ratingCount: totalRatings, // 'reviewsCount' is the count of ratings/reviews
        })
        .where('id = :courseId', { courseId })
        .execute();

      if (updateResult.affected === 0) {
        throw new InternalServerErrorException('Failed to update course statistics.');
      }
    });

    // 5. Return the newly created rating
    return savedRating;
  }

  async getAllInstructorsDetailed(
    page = 1,
    limit = 10,
    search?: string
  ): Promise<any> {
    const instructorRoleId = await this.getRoleId('instructor');
    if (!instructorRoleId) {
      return { instructors: [], pagination: this.paginationMeta(1, limit, 0) };
    }

    const pageNum = Math.max(1, parseInt(page + '', 10) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit + '', 10) || 10), 100);
    const skip = (pageNum - 1) * limitNum;

    // Step 1: Get instructor IDs with pagination and search
    let instructorQuery = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.profile', 'profile')
      .select(['user.id'])
      .where('user.roleId = :roleId', { roleId: instructorRoleId });

    if (search) {
      const searchTerm = `%${search.toLowerCase()}%`;
      instructorQuery = instructorQuery.andWhere(
        `(LOWER(profile.firstName) LIKE :searchTerm OR 
       LOWER(profile.lastName) LIKE :searchTerm OR 
       LOWER(user.email) LIKE :searchTerm)`,
        { searchTerm }
      );
    }

    const [instructorIds, total] = await Promise.all([
      instructorQuery
        .orderBy('user.created_at', 'DESC')
        .offset(skip)
        .limit(limitNum)
        .getMany()
        .then(users => users.map(user => user.id)),
      instructorQuery.getCount()
    ]);

    if (instructorIds.length === 0) {
      return { instructors: [], pagination: this.paginationMeta(pageNum, limitNum, total) };
    }

    // Step 2: Get detailed data for the paginated instructors in parallel
    const [instructorDetails, courseCounts, studentCounts] = await Promise.all([
      // Get basic instructor info
      this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('user.identityVerification', 'identityVerification')
        .select([
          'user.id',
          'user.email',
          'user.created_at',
          'profile.firstName',
          'profile.lastName',
          'profile.phoneNumber',
          'profile.photoUrl',
          'profile.metadata',
          'profile.country',
          'profile.city',
          'identityVerification.status', // Add this
        ])
        .where('user.id IN (:...instructorIds)', { instructorIds })
        .orderBy('user.created_at', 'DESC')
        .getMany(),

      // Get course counts
      this.courseRepository
        .createQueryBuilder('course')
        .select('course.createdBy', 'instructorId')
        .addSelect('COUNT(course.id)', 'courseCount')
        .where('course.createdBy IN (:...instructorIds)', { instructorIds })
        .andWhere('course.status = :courseStatus', { courseStatus: CourseStatus.PUBLISHED })
        .andWhere('course.isActive = :isActive', { isActive: true })
        .groupBy('course.createdBy')
        .getRawMany(),

      // Get unique student counts
      this.courseStudentRepo
        .createQueryBuilder('enrollment')
        .leftJoin('enrollment.course', 'course')
        .select('course.createdBy', 'instructorId')
        .addSelect('COUNT(DISTINCT enrollment.student_id)', 'studentCount')
        .where('course.createdBy IN (:...instructorIds)', { instructorIds })
        .andWhere('course.status = :courseStatus', { courseStatus: CourseStatus.PUBLISHED })
        .andWhere('course.isActive = :isActive', { isActive: true })
        .groupBy('course.createdBy')
        .getRawMany()
    ]);

    // Create lookup maps
    const courseCountMap = new Map(
      courseCounts.map(item => [item.instructorId, parseInt(item.courseCount) || 0])
    );

    const studentCountMap = new Map(
      studentCounts.map(item => [item.instructorId, parseInt(item.studentCount) || 0])
    );

    // Format the response
    const formattedInstructors = instructorDetails.map(instructor => ({
      id: instructor.id,
      name: `${instructor.profile?.firstName || ''} ${instructor.profile?.lastName || ''}`.trim() || 'N/A',
      email: instructor.email,
      approval: instructor.identityVerification?.status || 'pending',
      phone: instructor.profile?.phoneNumber || 'N/A',
      photoUrl: instructor.profile?.photoUrl || null,
      metaData: instructor.profile?.metadata || null,
      country: instructor.profile?.country || 'N/A',
      city: instructor.profile?.city || 'N/A',
      joinDate: this.formatDate(instructor.created_at),
      numberOfCourses: courseCountMap.get(instructor.id) || 0,
      totalStudents: studentCountMap.get(instructor.id) || 0
    }));

    return {
      instructors: formattedInstructors,
      pagination: this.paginationMeta(pageNum, limitNum, total)
    };
  }

  async getInstructorOverview(): Promise<any> {
    const instructorRoleId = await this.getRoleId('instructor');

    if (!instructorRoleId) {
      return {
        totalInstructors: 0,
        totalCourses: 0,
        totalEnrollments: 0
      };
    }

    // Execute all counts in parallel
    const [totalInstructors, totalCourses, totalEnrollments] = await Promise.all([
      // Total instructors
      this.userRepository.count({
        where: { role: { id: instructorRoleId } }
      }),

      // Total published and active courses
      this.courseRepository.count({
        where: {
          status: CourseStatus.PUBLISHED,
          isActive: true
        }
      }),

      // Total enrollments across all courses
      this.courseStudentRepo.count()
    ]);

    return {
      totalInstructors,
      totalCourses,
      totalEnrollments
    };
  }

  async getOneStudentOverview(studentId: string): Promise<any> {
    // ✅ OPTIMIZATION 1: Single query with all needed relations
    const student = await this.userRepository.findOne({
      where: {
        id: studentId,
        role: { name: 'student' }
      },
      relations: [
        'profile',
        'profile.category',
        'profile.speciality'
      ],
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        isIdentityVerified: true,
        isVerified: true,
        created_at: true,
        profile: {
          id: true,
          firstName: true,
          lastName: true,
          userName: true,
          phoneNumber: true,
          dateOfBirth: true,
          gender: true,
          country: true,
          state: true,
          city: true,
          photoUrl: true,
          resumePath: true,
          isPublic: true,
          completionPercentage: true,
          metadata: true,
        }
      }
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // ✅ OPTIMIZATION 2: Combine enrollment stats and recent courses in ONE optimized query
    // This replaces the separate count() and find() queries
    const enrollmentsQuery = this.courseStudentRepo
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.course', 'course')
      .leftJoin('course.instructor', 'instructor')
      .leftJoin('instructor.profile', 'instructorProfile')
      .addSelect([
        'instructor.id',
        'instructorProfile.id',
        'instructorProfile.firstName',
        'instructorProfile.lastName'
      ])
      .leftJoin('course.category', 'category')
      .addSelect(['category.id', 'category.name'])
      .where('enrollment.student_id = :studentId', { studentId })
      .orderBy('enrollment.created_at', 'DESC');

    // ✅ OPTIMIZATION 3: Get total count and recent enrollments in parallel
    const [totalEnrollments, recentEnrollments] = await Promise.all([
      enrollmentsQuery.getCount(),
      enrollmentsQuery
        .take(5)
        .getMany()
    ]);

    // ✅ OPTIMIZATION 4: Only fetch progress if there are enrollments
    let progressData = [];
    let itemCountsMap = new Map();

    if (recentEnrollments.length > 0) {
      const enrollmentIds = recentEnrollments.map(e => e.id);

      // Get progress data only for recent enrollments (not all)
      [progressData, itemCountsMap] = await Promise.all([
        // Progress data
        this.progressRepo
          .createQueryBuilder('progress')
          .select('progress.course_student_id', 'enrollmentId')
          .addSelect('COUNT(progress.id)', 'totalProgress')
          .addSelect('SUM(CASE WHEN progress.completed = true THEN 1 ELSE 0 END)', 'completedProgress')
          .where('progress.course_student_id IN (:...enrollmentIds)', { enrollmentIds })
          .groupBy('progress.course_student_id')
          .getRawMany(),

        // ✅ OPTIMIZATION 5: Get item counts efficiently using a subquery
        // Instead of loading all sections and items, count them directly
        this.getItemCountsForCourses(recentEnrollments.map(e => e.course.id))
      ]);
    }

    // ✅ OPTIMIZATION 6: Get completed courses count efficiently
    const completedCoursesCount = await this.progressRepo
      .createQueryBuilder('progress')
      .select('progress.course_student_id', 'enrollmentId')
      .addSelect('COUNT(progress.id)', 'total')
      .addSelect('SUM(CASE WHEN progress.completed = true THEN 1 ELSE 0 END)', 'completed')
      .innerJoin('progress.courseStudent', 'enrollment')
      .where('enrollment.student_id = :studentId', { studentId })
      .groupBy('progress.course_student_id')
      .having('COUNT(progress.id) > 0')
      .andHaving('SUM(CASE WHEN progress.completed = true THEN 1 ELSE 0 END) >= COUNT(progress.id)')
      .getRawMany()
      .then(results => results.length);

    // ✅ OPTIMIZATION 7: Create progress map (O(n) lookup)
    const progressMap = new Map();
    progressData.forEach(item => {
      const total = parseInt(item.totalProgress) || 0;
      const completed = parseInt(item.completedProgress) || 0;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      progressMap.set(item.enrollmentId, { progress, completed, total });
    });

    // ✅ OPTIMIZATION 8: Calculate age only if needed
    const age = student.profile?.dateOfBirth
      ? Math.floor((Date.now() - new Date(student.profile.dateOfBirth).getTime()) / 31557600000) // More accurate year calculation
      : null;

    // ✅ OPTIMIZATION 9: Format recent courses (simplified)
    const recentCourses = recentEnrollments.map(enrollment => {
      const progressInfo = progressMap.get(enrollment.id) || { progress: 0, completed: 0, total: 0 };
      const totalItems = itemCountsMap.get(enrollment.course.id) || 0;

      return {
        id: enrollment.course.id,
        name: enrollment.course.name,
        thumbnail: enrollment.course.courseImage,
        instructor: enrollment.course.instructor?.profile
          ? `${enrollment.course.instructor.profile.firstName || ''} ${enrollment.course.instructor.profile.lastName || ''}`.trim() || 'N/A'
          : 'N/A',
        category: enrollment.course.category?.name,
        enrollmentDate: enrollment.created_at,
        status: enrollment.course.status,
        progress: progressInfo.progress,
        completedItems: progressInfo.completed,
        totalItems: totalItems,
        lastActivity: enrollment.updated_at,
      };
    });

    // ✅ OPTIMIZATION 10: Simplified response structure
    return {
      student: {
        id: student.id,
        email: student.email,
        isEmailVerified: student.isEmailVerified,
        isIdentityVerified: student.isIdentityVerified,
        isVerified: student.isVerified,
        createdAt: student.created_at,
        profile: student.profile ? {
          firstName: student.profile.firstName,
          lastName: student.profile.lastName,
          fullName: `${student.profile.firstName || ''} ${student.profile.lastName || ''}`.trim(),
          userName: student.profile.userName,
          phoneNumber: student.profile.phoneNumber,
          dateOfBirth: student.profile.dateOfBirth,
          age,
          gender: student.profile.gender,
          country: student.profile.country,
          state: student.profile.state,
          city: student.profile.city,
          photoUrl: student.profile.photoUrl,
          resumePath: student.profile.resumePath,
          isPublic: student.profile.isPublic,
          completionPercentage: student.profile.completionPercentage,
          category: student.profile.category,
          speciality: student.profile.speciality,
          metadata: student.profile.metadata,
        } : null
      },
      statistics: {
        totalEnrollments,
        completedCourses: completedCoursesCount,
      },
      recentCourses,
    };
  }

  // ✅ OPTIMIZATION 11: Helper method to get item counts efficiently
  private async getItemCountsForCourses(courseIds: string[]): Promise<Map<string, number>> {
    if (courseIds.length === 0) return new Map();

    const results = await this.courseRepository
      .createQueryBuilder('course')
      .select('course.id', 'courseId')
      .addSelect('COUNT(item.id)', 'itemCount')
      .leftJoin('course.sections', 'section')
      .leftJoin('section.items', 'item')
      .where('course.id IN (:...courseIds)', { courseIds })
      .groupBy('course.id')
      .getRawMany();

    const itemCountsMap = new Map<string, number>();
    results.forEach(result => {
      itemCountsMap.set(result.courseId, parseInt(result.itemCount) || 0);
    });

    return itemCountsMap;
  }

  // Add this method to AdminService class in admin.service.ts
  async getSummaryStats(): Promise<any> {
    try {
      // Get role IDs in parallel
      const [studentRoleId, instructorRoleId] = await Promise.all([
        this.getRoleId('student'),
        this.getRoleId('instructor')
      ]);

      // Get course statistics in a single query
      const courseStats = await this.courseRepository
        .createQueryBuilder('course')
        .select([
          'COUNT(course.id) AS totalActive',
          'SUM(CASE WHEN course.isCourseFree = true THEN 1 ELSE 0 END) AS freeCount',
          'SUM(CASE WHEN course.isCourseFree = false THEN 1 ELSE 0 END) AS paidCount'
        ])
        .where('course.status = :status', { status: CourseStatus.PUBLISHED })
        .andWhere('course.isActive = :isActive', { isActive: true })
        .getRawOne();

      const activeCourses = parseInt(courseStats.totalactive) || 0;
      const freeCoursesCount = parseInt(courseStats.freecount) || 0;
      const paidCoursesCount = parseInt(courseStats.paidcount) || 0;

      // Execute remaining counts in parallel
      const [
        totalStudents,
        enrolledStudents,
        totalInstructors,
        totalAcademies,
      ] = await Promise.all([
        // Total students
        studentRoleId ? this.userRepository.count({
          where: { role: { id: studentRoleId } }
        }) : 0,

        // Enrolled students (distinct students with enrollments)
        studentRoleId ? this.courseStudentRepo
          .createQueryBuilder('cs')
          .innerJoin('cs.student', 'student')
          .where('student.roleId = :roleId', { roleId: studentRoleId })
          .select('COUNT(DISTINCT student.id)', 'count')
          .getRawOne()
          .then(result => parseInt(result?.count || '0')) : 0,

        // Total instructors
        instructorRoleId ? this.userRepository.count({
          where: { role: { id: instructorRoleId } }
        }) : 0,

        // Total academies
        this.academyRepository.count(),
      ]);

      // Calculate ratios
      const freeToPaidRatio = paidCoursesCount > 0
        ? Math.round((freeCoursesCount / paidCoursesCount) * 100) / 100
        : freeCoursesCount > 0 ? Infinity : 0;

      const freeCoursesPercentage = activeCourses > 0
        ? Math.round((freeCoursesCount / activeCourses) * 1000) / 10
        : 0;

      const paidCoursesPercentage = activeCourses > 0
        ? Math.round((paidCoursesCount / activeCourses) * 1000) / 10
        : 0;

      return {
        totalStudents,
        enrolledStudents,
        totalInstructors,
        totalAcademies,
        activeCourses,
        coursesBreakdown: {
          free: freeCoursesCount,
          paid: paidCoursesCount,
          freePercentage: freeCoursesPercentage,
          paidPercentage: paidCoursesPercentage,
        },
      };
    } catch (error) {
      console.error('Failed to fetch summary stats', error);
      throw new InternalServerErrorException('Failed to retrieve summary statistics');
    }
  }

  async getTopCourses(limit = 10): Promise<
    {
      courseId: string;
      courseName: string;
      instructorName: string;
      instructorPhotoUrl: string | null;
      enrolledStudents: number;
      averageRating: number;
      ratingCount: number;
      ranking: number;
      totalHours: number;
      courseDuration: number;
      courseDurationUnit: string;
      totalLessons: number;
    }[]
  > {
    // Get top courses by enrollment count
    const results = await this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.instructor', 'instructor')
      .innerJoin('instructor.profile', 'profile')
      .leftJoin('course.enrollments', 'enrollments')
      .select([
        'course.id',
        'course.name',
        'course.averageRating',
        'course.ratingCount',
        'course.totalHours',
        'course.courseDuration',
        'course.courseDurationUnit'
      ])
      .addSelect(
        `CONCAT(COALESCE(profile.firstName, ''), ' ', COALESCE(profile.lastName, ''))`,
        'instructorName',
      )
      .addSelect('profile.photoUrl', 'instructorPhotoUrl')
      .addSelect('COUNT(DISTINCT enrollments.id)', 'enrolledStudents')
      .addSelect(`(
      SELECT COUNT(DISTINCT si.id) 
      FROM course_sections cs 
      LEFT JOIN course_section_items si ON cs.id = si.section_id 
      WHERE cs.course_id = course.id 
      AND si."curriculumType" = 'lecture'
    )`, 'totalLessons')
      .where('course.status = :status', { status: 'published' })
      .andWhere('course.isActive = :isActive', { isActive: true })
      .groupBy('course.id')
      .addGroupBy('course.name')
      .addGroupBy('course.averageRating')
      .addGroupBy('course.ratingCount')
      .addGroupBy('course.totalHours')
      .addGroupBy('course.courseDuration')
      .addGroupBy('course.courseDurationUnit')
      .addGroupBy('profile.firstName')
      .addGroupBy('profile.lastName')
      .addGroupBy('profile.photoUrl')
      .orderBy('"enrolledStudents"', 'DESC')
      .addOrderBy('course.averageRating', 'DESC')
      .limit(limit)
      .getRawMany();

    // Format and add ranking using the correct field names
    return results.map((result, index) => ({
      courseId: result.course_id,
      courseName: result.course_name,
      instructorName: result.instructorName?.trim() || 'Unknown Instructor',
      instructorPhotoUrl: result.instructorPhotoUrl,
      enrolledStudents: parseInt(result.enrolledStudents, 10) || 0,
      averageRating: Math.round((result.course_average_rating || 0) * 10) / 10,
      ratingCount: parseInt(result.course_rating_count, 10) || 0,
      totalHours: parseFloat(result.course_total_hours) || 0,
      courseDuration: result.course_course_duration,
      courseDurationUnit: result.course_course_duration_unit,
      totalLessons: parseInt(result.totalLessons, 10) || 0,
      ranking: index + 1,
    }));
  }

  async getEnrollmentGeoStats(): Promise<any> {
    const studentRoleId = await this.getRoleId('student');
    if (!studentRoleId) return [];

    // Get total enrollments for percentage calculation
    const totalEnrollments = await this.courseStudentRepo.count();

    const GEO_COUNT_ALIAS = 'enrollmentcount';

    const geoStats = await this.courseStudentRepo
      .createQueryBuilder('enrollment')
      .innerJoin('enrollment.student', 'student')
      .innerJoin('student.profile', 'profile')
      .select('profile.country', 'country')
      .addSelect('COUNT(enrollment.id)', GEO_COUNT_ALIAS)
      .where('student.roleId = :roleId', { roleId: studentRoleId })
      .andWhere('profile.country IS NOT NULL')
      .groupBy('profile.country')
      .orderBy(GEO_COUNT_ALIAS, 'DESC')
      .getRawMany();

    return geoStats.map(stat => ({
      country: stat.country,
      enrollments: parseInt(stat[GEO_COUNT_ALIAS], 10),
      percentage: totalEnrollments > 0 ?
        Math.round((parseInt(stat[GEO_COUNT_ALIAS], 10) / totalEnrollments) * 1000) / 10 : 0,
    }));
  }

  async getCoursesSummary(): Promise<any> {
    try {
      // 1. Get all course statistics in one query
      const courseStats = await this.courseRepository
        .createQueryBuilder('course')
        .select([
          'COUNT(course.id) AS total_courses',
          'SUM(CASE WHEN course.isActive = true THEN 1 ELSE 0 END) AS active_courses',
          'SUM(CASE WHEN course.isActive = false THEN 1 ELSE 0 END) AS inactive_courses',
          'SUM(CASE WHEN course.status = :published THEN 1 ELSE 0 END) AS published_courses',
          'SUM(CASE WHEN course.status = :draft THEN 1 ELSE 0 END) AS draft_courses'
        ])
        .setParameters({
          published: CourseStatus.PUBLISHED,
          draft: CourseStatus.DRAFT
        })
        .getRawOne();

      const totalCourses = parseInt(courseStats.total_courses) || 0;
      const activeCourses = parseInt(courseStats.active_courses) || 0;
      const inactiveCourses = parseInt(courseStats.inactive_courses) || 0;
      const publishedCourses = parseInt(courseStats.published_courses) || 0;
      const draftCourses = parseInt(courseStats.draft_courses) || 0;

      // 2. Get total enrollments
      const totalEnrollments = await this.courseStudentRepo.count();

      // 3. Get completed courses count (courses where ALL enrolled students completed ALL items)
      const completedCoursesResult = await this.dataSource
        .createQueryBuilder()
        .select('COUNT(*)', 'completed_courses_count')
        .from(qb => {
          return qb
            .select('course.id', 'course_id')
            .from(Course, 'course')
            .innerJoin('course.enrollments', 'enrollments')
            .leftJoin(
              qb => qb
                .select('course.id', 'course_id')
                .addSelect('COUNT(item.id)', 'total_items')
                .from(CourseSectionItem, 'item')
                .innerJoin('item.section', 'section')
                .innerJoin('section.course', 'course')
                .groupBy('course.id'),
              'course_items',
              'course_items.course_id = course.id'
            )
            .leftJoin(
              qb => qb
                .select('cs.id', 'enrollment_id')
                .addSelect('course.id', 'course_id')
                .addSelect('COUNT(progress.id)', 'completed_items')
                .from(CourseProgress, 'progress')
                .innerJoin('progress.courseStudent', 'cs')
                .innerJoin('cs.course', 'course')
                .where('progress.completed = true')
                .groupBy('cs.id, course.id'),
              'student_progress',
              'student_progress.course_id = course.id AND student_progress.enrollment_id = enrollments.id'
            )
            .groupBy('course.id, course_items.total_items')
            .having('COUNT(enrollments.id) > 0') // Course has at least one enrollment
            .andHaving('COUNT(CASE WHEN student_progress.completed_items < course_items.total_items OR student_progress.completed_items IS NULL THEN 1 END) = 0');
          // This HAVING clause ensures:
          // - No student has completed fewer items than total course items
          // - No student has NULL progress (meaning they haven't started)
        }, 'completed_courses')
        .getRawOne();

      const completedCoursesCount = parseInt(completedCoursesResult?.completed_courses_count) || 0;
      const incompletedCoursesCount = totalCourses - completedCoursesCount;

      return {
        totalCourses,
        activeCourses,
        inactiveCourses,
        publishedCourses,
        draftCourses,
        totalEnrollments,
        completedCoursesCount,
        incompletedCoursesCount,
      };
    } catch (error) {
      console.error('Failed to fetch courses summary', error);
      throw new InternalServerErrorException('Failed to retrieve courses summary statistics');
    }
  }

  async getTopCategories(limit = 10): Promise<
    {
      categoryId: string;
      categoryName: string;
      courseCount: number;
      totalEnrollments: number;
      ranking: number;
    }[]
  > {
    const safeLimit = Math.min(Math.max(1, limit), 50);

    const results = await this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.category', 'category')
      .leftJoin('course.enrollments', 'enrollments')
      .select('category.id', 'categoryId')
      .addSelect('category.name', 'categoryName')
      .addSelect('COUNT(DISTINCT course.id)', 'courseCount')
      .addSelect('COUNT(DISTINCT enrollments.id)', 'totalEnrollments')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isActive = :isActive', { isActive: true })
      .andWhere('category.id IS NOT NULL') // Only include courses with categories
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('"totalEnrollments"', 'DESC')
      .addOrderBy('"courseCount"', 'DESC')
      .limit(safeLimit)
      .getRawMany();

    return results.map((result, index) => ({
      categoryId: result.categoryid || result.categoryId,
      categoryName: result.categoryname || result.categoryName,
      courseCount: parseInt(result.coursecount || result.courseCount, 10) || 0,
      totalEnrollments: parseInt(result.totalenrollments || result.totalEnrollments, 10) || 0,
      ranking: index + 1,
    }));
  }

  async getStudentsSummary(): Promise<any> {
    try {
      const studentRoleId = await this.getRoleId('student');
      if (!studentRoleId) {
        return {
          totalStudents: 0,
          totalEnrollments: 0,
          completedProfiles: 0,
          incompletedProfiles: 0
        };
      }

      // Get student count and profile completion stats
      const studentStats = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.profile', 'profile')
        .select([
          'COUNT(user.id) AS total_students',
          'SUM(CASE WHEN profile.completionPercentage = 100 THEN 1 ELSE 0 END) AS completed_profiles',
          'SUM(CASE WHEN profile.completionPercentage < 100 OR profile.completionPercentage IS NULL THEN 1 ELSE 0 END) AS incompleted_profiles'
        ])
        .where('user.roleId = :roleId', { roleId: studentRoleId })
        .getRawOne();

      // Get total enrollments separately (since it's a different entity)
      const totalEnrollments = await this.courseStudentRepo.count();

      return {
        totalStudents: parseInt(studentStats?.total_students || '0', 10),
        totalEnrollments: totalEnrollments,
        completedProfiles: parseInt(studentStats?.completed_profiles || '0', 10),
        incompletedProfiles: parseInt(studentStats?.incompleted_profiles || '0', 10)
      };

    } catch (error) {
      console.error('Failed to fetch students summary:', error);
      return {
        totalStudents: 0,
        totalEnrollments: 0,
        completedProfiles: 0,
        incompletedProfiles: 0
      };
    }
  }

  async getTopStudents(limit = 10): Promise<
    {
      studentId: string;
      name: string;
      email: string;
      photoUrl: string | null;
      joinDate: string;
      completedCourses: number;
      ranking: number;
    }[]
  > {
    try {
      const studentRoleId = await this.getRoleId('student');
      if (!studentRoleId) return [];

      const safeLimit = Math.min(Math.max(1, limit), 50);

      const results = await this.userRepository
        .createQueryBuilder('user')
        .innerJoin('user.profile', 'profile')
        .leftJoin(
          qb => qb
            .select('student.id', 'student_id')
            .addSelect('COUNT(DISTINCT course.id)', 'completed_count')
            .from(User, 'student')
            .innerJoin('student.enrollments', 'enrollment')
            .innerJoin('enrollment.course', 'course')
            .innerJoin(
              qb => qb
                .select('course.id', 'course_id')
                .addSelect('COUNT(item.id)', 'total_items')
                .from(CourseSectionItem, 'item')
                .innerJoin('item.section', 'section')
                .innerJoin('section.course', 'course')
                .groupBy('course.id'),
              'course_items',
              'course_items.course_id = course.id'
            )
            .innerJoin(
              qb => qb
                .select('progress.course_student_id', 'enrollment_id')
                .addSelect('COUNT(progress.id)', 'completed_items')
                .from(CourseProgress, 'progress')
                .where('progress.completed = true')
                .groupBy('progress.course_student_id'),
              'student_progress',
              'student_progress.enrollment_id = enrollment.id'
            )
            .where('student.roleId = :roleId', { roleId: studentRoleId })
            .andWhere('course_items.total_items > 0')
            .andWhere('student_progress.completed_items >= course_items.total_items')
            .groupBy('student.id'),
          'completions',
          'completions.student_id = user.id'
        )
        .select([
          'user.id AS student_id',
          'user.email AS email',
          'user.created_at AS join_date',
          'profile.firstName AS first_name',
          'profile.lastName AS last_name',
          'profile.photoUrl AS photo_url',
          'COALESCE(completions.completed_count, 0) AS completed_courses_count'
        ])
        .where('user.roleId = :roleId', { roleId: studentRoleId })
        .orderBy('completed_courses_count', 'DESC')
        .addOrderBy('user.created_at', 'DESC')
        .limit(safeLimit)
        .getRawMany();

      return results.map((result, index) => ({
        studentId: result.student_id,
        name: `${result.first_name || ''} ${result.last_name || ''}`.trim() || 'Unknown Student',
        email: result.email,
        photoUrl: result.photo_url,
        joinDate: this.formatDate(result.join_date),
        completedCourses: parseInt(result.completed_courses_count, 10) || 0,
        ranking: index + 1,
      }));

    } catch (error) {
      console.error('Failed to fetch top students:', error);
      return [];
    }
  }

  async getInstructorsSummary(): Promise<any> {
    try {
      const instructorRoleId = await this.getRoleId('instructor');
      if (!instructorRoleId) {
        return {
          totalInstructors: 0,
          approvedInstructors: 0,
          notApprovedInstructors: 0
        };
      }

      // Get all instructor statistics in one query
      const stats = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'COUNT(user.id) AS total_instructors',
          'SUM(CASE WHEN user.isVerified = true THEN 1 ELSE 0 END) AS approved_instructors',
          'SUM(CASE WHEN user.isVerified = false OR user.isVerified IS NULL THEN 1 ELSE 0 END) AS not_approved_instructors'
        ])
        .where('user.roleId = :roleId', { roleId: instructorRoleId })
        .getRawOne();

      return {
        totalInstructors: parseInt(stats?.total_instructors || '0', 10),
        approvedInstructors: parseInt(stats?.approved_instructors || '0', 10),
        notApprovedInstructors: parseInt(stats?.not_approved_instructors || '0', 10)
      };

    } catch (error) {
      console.error('Failed to fetch instructors summary:', error);
      return {
        totalInstructors: 0,
        approvedInstructors: 0,
        notApprovedInstructors: 0
      };
    }
  }

  async getRecentInstructors(limit = 10): Promise<
    {
      instructorId: string;
      name: string;
      photoUrl: string | null;
      courseCount: number;
      totalStudents: number;
      isVerified: boolean;
      joinDate: string;
    }[]
  > {
    try {
      const instructorRoleId = await this.getRoleId('instructor');
      if (!instructorRoleId) return [];

      const safeLimit = Math.min(Math.max(1, limit), 50);

      // Get recent instructors with their basic info
      const instructors = await this.userRepository
        .createQueryBuilder('user')
        .innerJoinAndSelect('user.profile', 'profile')
        .select([
          'user.id',
          'user.isVerified',
          'user.created_at',
          'profile.firstName',
          'profile.lastName',
          'profile.photoUrl'
        ])
        .where('user.roleId = :roleId', { roleId: instructorRoleId })
        .orderBy('user.created_at', 'DESC')
        .limit(safeLimit)
        .getMany();

      if (instructors.length === 0) return [];

      // Get course and student counts in parallel
      const instructorStats = await Promise.all(
        instructors.map(async (instructor) => {
          const [courseCount, totalStudents] = await Promise.all([
            // Course count - createdBy is a direct string/UUID
            this.courseRepository.count({
              where: {
                createdBy: instructor.id, // Direct string comparison
                status: CourseStatus.PUBLISHED,
                isActive: true
              }
            }),
            // Student count (enrollments in instructor's courses)
            this.courseStudentRepo
              .createQueryBuilder('enrollment')
              .innerJoin('enrollment.course', 'course')
              .where('course.createdBy = :instructorId', { instructorId: instructor.id })
              .andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
              .andWhere('course.isActive = :isActive', { isActive: true })
              .getCount()
          ]);

          return {
            instructorId: instructor.id,
            name: `${instructor.profile.firstName || ''} ${instructor.profile.lastName || ''}`.trim() || 'Unknown Instructor',
            photoUrl: instructor.profile.photoUrl,
            courseCount,
            totalStudents,
            isVerified: Boolean(instructor.isVerified),
            joinDate: this.formatDate(instructor.created_at),
          };
        })
      );

      return instructorStats;

    } catch (error) {
      console.error('Failed to fetch recent instructors:', error);
      return [];
    }
  }

  async getAcademiesSummary(): Promise<any> {
    try {
      // Get all academy statistics in one query
      const stats = await this.academyRepository
        .createQueryBuilder('academy')
        .select([
          'COUNT(academy.id) AS total_academies',
          'SUM(CASE WHEN academy.isVerified = true THEN 1 ELSE 0 END) AS approved_academies',
          'SUM(CASE WHEN academy.isVerified = false OR academy.isVerified IS NULL THEN 1 ELSE 0 END) AS not_approved_academies'
        ])
        .getRawOne();

      return {
        totalAcademies: parseInt(stats?.total_academies || '0', 10),
        approvedAcademies: parseInt(stats?.approved_academies || '0', 10),
        notApprovedAcademies: parseInt(stats?.not_approved_academies || '0', 10)
      };

    } catch (error) {
      console.error('Failed to fetch academies summary:', error);
      return {
        totalAcademies: 0,
        approvedAcademies: 0,
        notApprovedAcademies: 0
      };
    }
  }

  async getTopAcademies(limit = 10): Promise<
    {
      academyId: string;
      academyName: string;
      courseCount: number;
      totalStudents: number;
      ranking: number;
    }[]
  > {
    try {
      const safeLimit = Math.min(Math.max(1, limit), 50);

      // Get all academies first
      const allAcademies = await this.academyRepository
        .createQueryBuilder('academy')
        .select(['academy.id', 'academy.name'])
        .orderBy('academy.created_at', 'DESC')
        .getMany();

      if (allAcademies.length === 0) return [];

      const academyIds = allAcademies.map(academy => academy.id);

      // Get course and student counts for these academies
      const academyStats = await this.courseRepository
        .createQueryBuilder('course')
        .innerJoin('course.academy', 'academy')
        .leftJoin('course.enrollments', 'enrollments')
        .select([
          'academy.id AS academy_id',
          'academy.name AS academy_name',
          'COUNT(DISTINCT course.id) AS course_count',
          'COUNT(DISTINCT enrollments.id) AS total_students'
        ])
        .where('academy.id IN (:...academyIds)', { academyIds })
        .andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
        .andWhere('course.isActive = :isActive', { isActive: true })
        .groupBy('academy.id, academy.name')
        .getRawMany();

      // Create a map for quick lookup
      const statsMap = new Map();
      academyStats.forEach(stat => {
        statsMap.set(stat.academy_id, {
          courseCount: parseInt(stat.course_count, 10) || 0,
          totalStudents: parseInt(stat.total_students, 10) || 0,
        });
      });

      // Combine all academies with their stats (default to 0 if not found)
      const academiesWithStats = allAcademies.map(academy => {
        const stats = statsMap.get(academy.id) || { courseCount: 0, totalStudents: 0 };

        return {
          academyId: academy.id,
          academyName: academy.name || 'Unknown Academy',
          courseCount: stats.courseCount,
          totalStudents: stats.totalStudents,
          ranking: 0, // Will be set after sorting
        };
      });

      // Sort by totalStudents (descending) and apply limit
      return academiesWithStats
        .sort((a, b) => b.totalStudents - a.totalStudents)
        .slice(0, safeLimit)
        .map((academy, index) => ({
          ...academy,
          ranking: index + 1,
        }));

    } catch (error) {
      console.error('Failed to fetch top academies:', error);
      return [];
    }
  }

  async publicSearch(
    query?: string,
    page?: any,
    limit?: any,
    type: 'all' | 'instructors' | 'academies' = 'all',
    country?: string,
    city?: string,
    academyType?: string,
    minExperience?: any, // New parameter
    maxExperience?: any, // New parameter
  ): Promise<any> {
    // Parse and validate page parameter
    let pageNum = 1;
    if (page !== undefined && page !== null) {
      if (typeof page === 'string') {
        pageNum = parseInt(page, 10);
      } else if (typeof page === 'number') {
        pageNum = page;
      }
      if (isNaN(pageNum) || pageNum < 1) {
        pageNum = 1;
      }
    }

    // Parse and validate limit parameter
    let limitNum = 10;
    if (limit !== undefined && limit !== null) {
      if (typeof limit === 'string') {
        limitNum = parseInt(limit, 10);
      } else if (typeof limit === 'number') {
        limitNum = limit;
      }
      if (isNaN(limitNum) || limitNum < 1) {
        limitNum = 10;
      }
      // Cap the limit for safety
      if (limitNum > 100) {
        limitNum = 100;
      }
    }

    // Parse and validate experience parameters
    let minExpNum: number | undefined;
    if (minExperience !== undefined && minExperience !== null && minExperience !== '') {
      if (typeof minExperience === 'string') {
        minExpNum = parseFloat(minExperience);
      } else if (typeof minExperience === 'number') {
        minExpNum = minExperience;
      }
      if (isNaN(minExpNum) || minExpNum < 0) {
        minExpNum = undefined;
      }
    }

    let maxExpNum: number | undefined;
    if (maxExperience !== undefined && maxExperience !== null && maxExperience !== '') {
      if (typeof maxExperience === 'string') {
        maxExpNum = parseFloat(maxExperience);
      } else if (typeof maxExperience === 'number') {
        maxExpNum = maxExperience;
      }
      if (isNaN(maxExpNum) || maxExpNum < 0) {
        maxExpNum = undefined;
      }
    }

    // Validate experience range
    if (minExpNum !== undefined && maxExpNum !== undefined && minExpNum > maxExpNum) {
      throw new BadRequestException('minExperience cannot be greater than maxExperience');
    }

    const skip = (pageNum - 1) * limitNum;

    const results = {
      instructors: [],
      academies: [],
      totalInstructors: 0,
      totalAcademies: 0,
      page: pageNum,
      limit: limitNum,
      totalInstructorPages: 0,
      totalAcademyPages: 0,
    };

    // Helper function to calculate years of experience from metadata
    const calculateYearsOfExperience = (metadata: ProfileMetadataDto): number => {
      if (!metadata?.experience || metadata.experience.length === 0) {
        return 0;
      }

      let totalMonths = 0;
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

      for (const exp of metadata.experience) {
        const startYear = exp.startYear;
        const startMonth = exp.startMonth;

        let endYear, endMonth;

        if (exp.currentlyWorkHere) {
          endYear = currentYear;
          endMonth = currentMonth;
        } else if (exp.endYear && exp.endMonth) {
          endYear = exp.endYear;
          endMonth = exp.endMonth;
        } else {
          continue; // Skip incomplete experience entries
        }

        // Calculate months of experience for this entry
        const months = ((endYear - startYear) * 12) + (endMonth - startMonth);
        totalMonths += months > 0 ? months : 0;
      }

      // Convert months to years (with one decimal place)
      const years = totalMonths / 12;
      return parseFloat(years.toFixed(1));
    };

    // Search for instructors if requested
    if (type === 'all' || type === 'instructors') {
      // First, get all instructors with their profiles
      let instructorQuery = this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .leftJoinAndSelect('user.academy', 'academy')
        .leftJoinAndSelect('user.role', 'role')
        .where('role.name = :roleName', { roleName: 'instructor' });

      // Add search filter if query is provided
      if (query && query.trim() !== '') {
        instructorQuery.andWhere(
          new Brackets(qb => {
            qb.where('user.email ILIKE :query', { query: `%${query}%` })
              .orWhere('profile.firstName ILIKE :query', { query: `%${query}%` })
              .orWhere('profile.lastName ILIKE :query', { query: `%${query}%` })
              .orWhere('profile.metadata::text ILIKE :query', { query: `%${query}%` });
          })
        );
      }

      // Add country filter
      if (country && country.trim() !== '') {
        instructorQuery.andWhere('profile.country->>\'name\' ILIKE :country', {
          country: `%${country.trim()}%`
        });
      }

      // Add city filter
      if (city && city.trim() !== '') {
        instructorQuery.andWhere('profile.state->>\'name\' ILIKE :city', {
          city: `%${city.trim()}%`
        });
      }

      // Get initial results
      const allInstructors = await instructorQuery.getMany();

      // Filter by experience if needed
      let filteredInstructors = allInstructors;

      if (minExpNum !== undefined || maxExpNum !== undefined) {
        filteredInstructors = allInstructors.filter(instructor => {
          const metadata = instructor.profile?.metadata as ProfileMetadataDto;
          const yearsOfExperience = calculateYearsOfExperience(metadata);

          if (minExpNum !== undefined && maxExpNum !== undefined) {
            return yearsOfExperience >= minExpNum && yearsOfExperience <= maxExpNum;
          } else if (minExpNum !== undefined) {
            return yearsOfExperience >= minExpNum;
          } else if (maxExpNum !== undefined) {
            return yearsOfExperience <= maxExpNum;
          }
          return true;
        });
      }

      // Update total count
      results.totalInstructors = filteredInstructors.length;
      results.totalInstructorPages = Math.ceil(results.totalInstructors / limitNum);

      // Apply pagination
      const paginatedInstructors = filteredInstructors
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(skip, skip + limitNum);

      // Format instructor results
      results.instructors = paginatedInstructors.map(instructor => {
        const metadata = instructor.profile?.metadata as ProfileMetadataDto;
        const yearsOfExperience = calculateYearsOfExperience(metadata);

        return {
          id: instructor.id,
          email: instructor.email,
          isVerified: instructor.isVerified,
          role: instructor.role ? instructor.role.name : null,
          yearsOfExperience: yearsOfExperience, // Add years of experience to response
          profile: instructor.profile ? {
            firstName: instructor.profile.firstName,
            lastName: instructor.profile.lastName,
            fullName: `${instructor.profile.firstName} ${instructor.profile.lastName}`,
            bio: metadata?.bio,
            photo: instructor.profile.photoUrl,
            country: instructor.profile.country,
            city: instructor.profile.city,
            phone: instructor.profile.phoneNumber,
            experience: metadata?.experience, // Include experience in response
            skills: metadata?.skills, // Include skills in response
            // Add other relevant fields
          } : null,
          academy: instructor.academy ? {
            id: instructor.academy.id,
            name: instructor.academy.name,
            slug: instructor.academy.slug,
            image: instructor.academy.image,
          } : null,
          createdAt: instructor.created_at,
        };
      });
    }

    // Search for academies if requested (remains the same)
    if (type === 'all' || type === 'academies') {
      const academyQuery = this.academyRepository
        .createQueryBuilder('academy')
        .where('academy.isVerified = :isVerified', { isVerified: true });

      // Add search filter if query is provided
      if (query && query.trim() !== '') {
        academyQuery.andWhere(
          new Brackets(qb => {
            qb.where('academy.name ILIKE :query', { query: `%${query}%` })
              .orWhere('academy.description ILIKE :query', { query: `%${query}%` })
              .orWhere('academy.about ILIKE :query', { query: `%${query}%` })
            //.orWhere('academy.keyWords::text ILIKE :query', { query: `%${query}%` });
          })
        );
      }

      // Add country filter
      if (country && country.trim() !== '') {
        academyQuery.andWhere('academy.country->>\'name\' ILIKE :country', {
          country: `%${country.trim()}%`
        });
      }

      // Add city filter
      if (city && city.trim() !== '') {
        academyQuery.andWhere('academy.city->>\'name\' ILIKE :city', {
          city: `%${city.trim()}%`
        });
      }

      // Add academy type filter
      if (academyType && academyType.trim() !== '') {
        academyQuery.andWhere('academy.type = :academyType', { academyType: academyType.trim() });
      }

      // Get total count
      results.totalAcademies = await academyQuery.getCount();
      results.totalAcademyPages = Math.ceil(results.totalAcademies / limitNum);

      // Get paginated results
      const academies = await academyQuery
        .orderBy('academy.created_at', 'DESC')
        .skip(skip)
        .take(limitNum)
        .getMany();

      // Format academy results
      results.academies = academies.map(academy => ({
        id: academy.id,
        name: academy.name,
        slug: academy.slug,
        image: academy.image,
        cover: academy.cover,
        description: academy.description,
        type: academy.type,
        size: academy.size,
        foundedYear: academy.foundedYear,
        address: academy.address,
        city: academy.city,
        country: academy.country,
        email: academy.email,
        phone: academy.phone,
        socialLinks: academy.socialLinks,
        studentsCount: academy.displayRealStudentsCount ? academy.studentsCount : academy.fakeStudentsCount,
        isVerified: academy.isVerified,
        completionPercentage: academy.completionPercentage,
        createdAt: academy.created_at,
      }));
    }

    return results;
  }

  async getOptimizedFinancialStats(): Promise<any[]> {
    // Single comprehensive query
    const results = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.payment', 'payment')
      .select([
        'transaction.currency as currency',
        'COALESCE(SUM(CASE WHEN transaction.status = :paidStatus THEN transaction.totalPrice ELSE 0 END), 0) as totalSales',
        'COALESCE(SUM(CASE WHEN transaction.status = :paidStatus THEN transaction.amount ELSE 0 END), 0) as instructorRevenue',
        'COALESCE(SUM(CASE WHEN transaction.status = :paidStatus THEN transaction.platformFeeAmount ELSE 0 END), 0) as platformFees',
        'COUNT(DISTINCT CASE WHEN transaction.status = :paidStatus THEN transaction.id END) as transactionCount',
        'COUNT(DISTINCT payment.id) as paymentCount',
        'COUNT(DISTINCT CASE WHEN payment.status = :successPaymentStatus THEN payment.id END) as successfulPaymentCount',
      ])
      .where('payment.status IN (:...paymentStatuses) OR payment.id IS NULL', {
        paidStatus: TransactionStatus.PAID,
        successPaymentStatus: PaymentStatus.SUCCESS,
        paymentStatuses: [PaymentStatus.SUCCESS, PaymentStatus.REFUNDED],
      })
      .andWhere('transaction.currency IS NOT NULL')
      .groupBy('transaction.currency')
      .orderBy('transaction.currency', 'ASC')
      .getRawMany();

    return results.map(row => ({
      currency: row.currency,
      totalSales: parseFloat(row.totalsales || '0'),
      instructorRevenue: parseFloat(row.instructorrevenue || '0'),
      totalTaxes: parseFloat(row.platformfees || '0'),
      totalNetIncome: parseFloat(row.platformfees || '0'),
      // transactionCount: parseInt(row.transactioncount || '0'),
      // paymentCount: parseInt(row.paymentcount || '0'),
      // successfulPaymentCount: parseInt(row.successfulpaymentcount || '0'),
    }));
  }

  async getAllTransactions(filters: GetAllTransactionsFilters): Promise<{
    transactions: Transaction[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      creatorId,
      buyerId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = filters;

    const where: FindOptionsWhere<Transaction> = {};

    if (creatorId) {
      where.creatorId = creatorId;
    }

    if (buyerId) {
      where.buyerId = buyerId;
    }

    if (status && Object.values(TransactionStatus).includes(status as TransactionStatus)) {
      where.status = status as TransactionStatus;
    }

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      where.created_at = Between(start, end);
    }

    const [transactions, total] = await this.transactionRepository.findAndCount({
      where,
      relations: ['creator', 'buyer', 'payment', 'cartItem'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  async getFinancialTopInstructors(limit = 10): Promise<any[]> {
    const results = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.creator', 'instructor')
      .leftJoin('instructor.profile', 'profile')
      .select([
        'instructor.id as instructorId',
        'profile.firstName as firstName',
        'profile.lastName as lastName',
        'CONCAT(profile.firstName, \' \', profile.lastName) as instructorName',
        'instructor.email as instructorEmail',
        'transaction.currency as currency',
        'COALESCE(SUM(transaction.amount), 0) as earnings',
        'COUNT(DISTINCT transaction.id) as transactionCount',
        'COUNT(DISTINCT transaction.itemId) as courseCount',
      ])
      .where('transaction.status = :status', { status: TransactionStatus.PAID })
      .groupBy('instructor.id, profile.firstName, profile.lastName, instructor.email, transaction.currency')
      .orderBy('earnings', 'DESC')
      .getRawMany();

    // Group by instructor
    const instructorMap = new Map();

    results.forEach(row => {
      const instructorId = row.instructorid;

      if (!instructorMap.has(instructorId)) {
        instructorMap.set(instructorId, {
          instructorId,
          instructorName: row.instructorname,
          //firstName: row.firstname,
          //lastName: row.lastname,
          instructorEmail: row.instructoremail,
          //totalEarnings: 0,
          earningsByCurrency: [],
          totalTransactionCount: 0,
          courseCount: parseInt(row.coursecount || '0'),
        });
      }

      const instructor = instructorMap.get(instructorId);
      const earnings = parseFloat(row.earnings || '0');

      //instructor.totalEarnings += earnings;
      instructor.totalTransactionCount += parseInt(row.transactioncount || '0');

      instructor.earningsByCurrency.push({
        currency: row.currency,
        amount: earnings,
        transactionCount: parseInt(row.transactioncount || '0'),
      });
    });

    return Array.from(instructorMap.values())
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  async getFinancialTopStudents(limit = 10): Promise<any[]> {
    const results = await this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoin('payment.user', 'student')
      .leftJoin('student.profile', 'profile')
      .leftJoin('payment.transactions', 'transaction')
      .select([
        'student.id as studentId',
        'profile.firstName as firstName',
        'profile.lastName as lastName',
        'CONCAT(profile.firstName, \' \', profile.lastName) as studentName',
        'student.email as studentEmail',
        'transaction.currency as currency',
        'COALESCE(SUM(payment.amount), 0) as spentAmount',
        'COUNT(DISTINCT payment.id) as paymentCount',
        'COUNT(DISTINCT transaction.itemId) as courseCount',
        'MAX(payment.created_at) as lastPurchaseDate',
      ])
      .where('payment.status = :status', { status: PaymentStatus.SUCCESS })
      .groupBy('student.id, profile.firstName, profile.lastName, student.email, transaction.currency')
      .orderBy('spentAmount', 'DESC')
      .getRawMany();

    // Group by student
    const studentMap = new Map();

    results.forEach(row => {
      const studentId = row.studentid;

      if (!studentMap.has(studentId)) {
        studentMap.set(studentId, {
          studentId,
          studentName: row.studentname,
          //firstName: row.firstname,
          //lastName: row.lastname,
          studentEmail: row.studentemail,
          //totalSpent: 0,
          spendingByCurrency: [],
          totalPaymentCount: 0,
          courseCount: parseInt(row.coursecount || '0'),
          lastPurchaseDate: row.lastpurchasedate,
        });
      }

      const student = studentMap.get(studentId);
      const spentAmount = parseFloat(row.spentamount || '0');

      //student.totalSpent += spentAmount;
      student.totalPaymentCount += parseInt(row.paymentcount || '0');

      student.spendingByCurrency.push({
        currency: row.currency,
        amount: spentAmount,
        paymentCount: parseInt(row.paymentcount || '0'),
      });

      // Update last purchase date if this one is newer
      if (row.lastpurchasedate) {
        const currentDate = new Date(row.lastpurchasedate);
        const existingDate = student.lastPurchaseDate ? new Date(student.lastPurchaseDate) : null;

        if (!existingDate || currentDate > existingDate) {
          student.lastPurchaseDate = row.lastpurchasedate;
        }
      }
    });

    return Array.from(studentMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit);
  }

  async approveInstructorIdentity(instructorId: string, adminId: string): Promise<void> {
    // 1. Find the instructor
    const instructor = await this.userRepository.findOne({
      where: { id: instructorId },
      relations: ['identityVerification']
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // 2. Check if there's an identity verification submission
    if (!instructor.identityVerification) {
      throw new NotFoundException('No identity verification submission found for this instructor');
    }

    // 3. Update the identity verification status
    await this.identityRepository.update(
      { userId: instructorId },
      {
        status: IdentityVerificationStatus.APPROVED,
        reviewedBy: { id: adminId } as User,
        rejectionReason: null // Clear any previous rejection reason
      }
    );

    // 4. Update user's verification status
    await this.userRepository.update(
      { id: instructorId },
      {
        isIdentityVerified: true,
        isVerified: true // Also set overall verification status
      }
    );
  }

  async rejectInstructorIdentity(
    instructorId: string,
    rejectionReason: string,
    adminId: string
  ): Promise<void> {
    // 1. Find the instructor
    const instructor = await this.userRepository.findOne({
      where: { id: instructorId },
      relations: ['identityVerification']
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found');
    }

    // 2. Check if there's an identity verification submission
    if (!instructor.identityVerification) {
      throw new NotFoundException('No identity verification submission found for this instructor');
    }

    // 3. Update the identity verification status
    await this.identityRepository.update(
      { userId: instructorId },
      {
        status: IdentityVerificationStatus.REJECTED,
        rejectionReason,
        reviewedBy: { id: adminId } as User
      }
    );

    // 4. Update user's verification status
    await this.userRepository.update(
      { id: instructorId },
      {
        isIdentityVerified: false,
        isVerified: false // Also set overall verification status to false
      }
    );
  }

  async approveAcademy(
    academyId: string,
  ): Promise<void> {
    const academy = await this.academyRepository.findOne({
      where: { id: academyId },
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    await this.academyRepository.update(
      { id: academyId },
      {
        isVerified: true,
        isIdentityVerified: true,
      },
    );
  }

  async rejectAcademy(
    academyId: string,
  ): Promise<void> {
    const academy = await this.academyRepository.findOne({
      where: { id: academyId },
    });

    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    await this.academyRepository.update(
      { id: academyId },
      {
        isVerified: false,
        isIdentityVerified: false,
      },
    );
  }
}
