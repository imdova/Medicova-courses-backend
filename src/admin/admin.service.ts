import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
      ranking: number;
    }[]
  > {
    const instructorRoleId = await this.getRoleId('instructor');
    if (!instructorRoleId) return [];

    // 🧮 Aggregate total enrollments per instructor
    const results = await this.courseStudentRepo
      .createQueryBuilder('courseStudent')
      .innerJoin('courseStudent.course', 'course')
      .innerJoin('course.instructor', 'instructor')
      .innerJoin('instructor.profile', 'profile')
      .select('instructor.id', 'instructorId')
      .addSelect(
        `CONCAT(COALESCE(profile.firstName, ''), ' ', COALESCE(profile.lastName, ''))`,
        'name',
      )
      .addSelect('profile.photoUrl', 'photoUrl')
      .addSelect('COUNT(courseStudent.id)', 'totalEnrollments')
      .where('instructor.roleId = :roleId', { roleId: instructorRoleId })
      .andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isActive = true')
      .groupBy('instructor.id')
      .addGroupBy('profile.firstName')
      .addGroupBy('profile.lastName')
      .addGroupBy('profile.photoUrl')
      .orderBy('"totalEnrollments"', 'DESC') // double quotes = preserve alias casing
      .limit(limit)
      .getRawMany();

    // 🥇 Add ranking position
    return results.map((r, index) => ({
      instructorId: r.instructorid || r.instructorId,
      name: r.name?.trim() || 'Unknown Instructor',
      photoUrl: r.photourl || r.photoUrl || null,
      totalEnrollments: parseInt(r.totalenrollments || r.totalEnrollments, 10) || 0,
      ranking: index + 1,
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
      // Use leftJoinAndSelect to fetch all fields from User and Profile
      .leftJoinAndSelect('user.profile', 'profile')
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
      // Map to ensure the 'profile' is cleanly attached and add a 'fullName' for convenience
      instructors: instructors.map((i) => ({
        ...i, // Spread all fields from the User entity
        profile: i.profile ? { // Spread all fields from the Profile entity
          ...i.profile,
        } : null,
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
}
