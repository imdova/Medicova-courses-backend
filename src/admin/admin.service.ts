import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { Course, CourseStatus } from '../course/entities/course.entity';
import { Profile } from '../profile/entities/profile.entity';
import { Role } from '../user/entities/roles.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) { }

  async getDashboardStats(): Promise<any> {
    const [students, newStudents, courses, topInstructors] = await Promise.all([
      this.getStudentStats(),
      this.getNewStudentStats(),
      this.getCourseStats(),
      this.getTopInstructors(),
    ]);

    return {
      students,
      newStudents,
      courses,
      topInstructors,
    };
  }

  private async getStudentStats(): Promise<any> {
    // Get student role
    const studentRole = await this.roleRepository.findOne({
      where: { name: 'student' },
    });

    if (!studentRole) {
      return { total: 0, yearOverYearChange: 0 };
    }

    // Total students
    const total = await this.userRepository.count({
      where: { role: { id: studentRole.id } },
    });

    // Calculate year-over-year change
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Students created before one year ago (students that existed last year)
    const studentsLastYear = await this.userRepository
      .createQueryBuilder('user')
      .where('user.roleId = :roleId', { roleId: studentRole.id })
      .andWhere('user.created_at <= :oneYearAgo', { oneYearAgo })
      .getCount();

    const yearOverYearChange =
      studentsLastYear > 0
        ? ((total - studentsLastYear) / studentsLastYear) * 100
        : total > 0
          ? 100
          : 0;

    return {
      total,
      yearOverYearChange: Math.round(yearOverYearChange * 10) / 10,
    };
  }

  private async getNewStudentStats(): Promise<any> {
    const studentRole = await this.roleRepository.findOne({
      where: { name: 'student' },
    });

    if (!studentRole) {
      return { newThisMonth: 0, monthOverMonthChange: 0 };
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // New students this month
    const newThisMonth = await this.userRepository
      .createQueryBuilder('user')
      .where('user.roleId = :roleId', { roleId: studentRole.id })
      .andWhere('user.created_at >= :startOfMonth', { startOfMonth })
      .getCount();

    // New students last month
    const newLastMonth = await this.userRepository
      .createQueryBuilder('user')
      .where('user.roleId = :roleId', { roleId: studentRole.id })
      .andWhere('user.created_at >= :startOfLastMonth', { startOfLastMonth })
      .andWhere('user.created_at <= :endOfLastMonth', { endOfLastMonth })
      .getCount();

    const monthOverMonthChange =
      newLastMonth > 0
        ? ((newThisMonth - newLastMonth) / newLastMonth) * 100
        : newThisMonth > 0
          ? 100
          : 0;

    return {
      newThisMonth,
      monthOverMonthChange: Math.round(monthOverMonthChange * 10) / 10,
    };
  }

  private async getCourseStats(): Promise<any> {
    // Total active courses
    const totalActive = await this.courseRepository.count({
      where: {
        status: CourseStatus.PUBLISHED,
        isActive: true,
      },
    });

    // New courses this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const newThisMonth = await this.courseRepository
      .createQueryBuilder('course')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })
      .andWhere('course.isActive = :isActive', { isActive: true })
      .andWhere('course.created_at >= :startOfMonth', { startOfMonth })
      .getCount();

    return {
      totalActive,
      newThisMonth,
    };
  }

  private async getTopInstructors(limit: number = 10): Promise<any[]> {
    // Get instructor role
    const instructorRole = await this.roleRepository.findOne({
      where: { name: 'instructor' },
    });

    if (!instructorRole) {
      return [];
    }

    // Build query - Fixed to get user ID and proper field names
    const topInstructors = await this.profileRepository
      .createQueryBuilder('profile')
      .innerJoin('profile.user', 'user')
      .leftJoin('profile.ratings', 'ratings')
      .leftJoin(Course, 'course', 'course.createdBy = user.id')
      .select([
        'user.id AS userId', // Get user ID instead of profile ID
        'profile.firstName AS firstName',
        'profile.lastName AS lastName',
        'profile.photoUrl AS photoUrl',
        'profile.metadata AS metadata',
        'COALESCE(AVG(ratings.rating), 0) AS calculatedAverageRating',
        'COUNT(DISTINCT ratings.id) AS totalRatings',
        'COUNT(DISTINCT course.id) AS totalCourses'
      ])
      .where('user.roleId = :roleId', { roleId: instructorRole.id })
      .groupBy('user.id') // Group by user ID
      .addGroupBy('profile.firstName')
      .addGroupBy('profile.lastName')
      .addGroupBy('profile.photoUrl')
      .addGroupBy('profile.metadata')
      .orderBy('calculatedAverageRating', 'DESC')
      .addOrderBy('totalRatings', 'DESC')
      .addOrderBy('totalCourses', 'DESC')
      .limit(limit)
      .getRawMany();

    return topInstructors.map((instructor) => {
      const title = this.extractTitle(instructor.metadata);
      const averageRating = parseFloat(instructor.calculatedaveragerating) || 0;

      return {
        id: instructor.userid, // Use user ID instead of profile ID
        name: `${instructor.firstname || ''} ${instructor.lastname || ''}`.trim(), // Handle undefined names
        photoUrl: instructor.photourl || null,
        title,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: parseInt(instructor.totalratings) || 0,
        totalCourses: parseInt(instructor.totalcourses) || 0,
      };
    });
  }

  private extractTitle(metadata: any): string {
    // Extract academic title from metadata
    if (metadata?.academicTitle) {
      return metadata.academicTitle;
    }
    if (metadata?.title) {
      return metadata.title;
    }
    return 'Instructor';
  }

  // In the service - add parsing logic
  async getAllStudents(page: any = 1, limit: any = 10): Promise<any> {
    try {
      // Parse to numbers
      const pageNumber = parseInt(page, 10) || 1;
      const limitNumber = parseInt(limit, 10) || 10;

      // Ensure positive numbers
      const parsedPage = Math.max(1, pageNumber);
      const parsedLimit = Math.max(1, Math.min(limitNumber, 100)); // Cap at 100 per page

      const studentRole = await this.roleRepository.findOne({
        where: { name: 'student' },
      });

      if (!studentRole) {
        return {
          students: [],
          pagination: {
            page: parsedPage,
            limit: parsedLimit,
            total: 0,
            totalPages: 0,
          },
        };
      }

      const skip = (parsedPage - 1) * parsedLimit;

      // Get students with their profiles
      const [students, total] = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.profile', 'profile')
        .where('user.roleId = :roleId', { roleId: studentRole.id })
        .orderBy('user.created_at', 'DESC')
        .skip(skip)
        .take(parsedLimit)
        .getManyAndCount();

      // Format the response
      const formattedStudents = students.map(student => ({
        studentId: student.id,
        name: student.profile
          ? `${student.profile.firstName || ''} ${student.profile.lastName || ''}`.trim()
          : 'N/A',
        email: student.email,
        joinDate: this.formatDate(student.created_at),
      }));

      const totalPages = Math.ceil(total / parsedLimit);

      return {
        students: formattedStudents,
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
          totalPages,
          hasNext: parsedPage < totalPages,
          hasPrev: parsedPage > 1,
        },
      };
    } catch (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }
  }

  private formatDate(date: Date): string {
    if (!date) return 'N/A';

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    return new Date(date).toLocaleDateString('en-US', options);
  }
}