import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBody, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { IdentityVerificationStatus } from 'src/user/entities/identity-verification.entity';
import { RejectIdentityDto } from './dto/reject-identity.dto';
import { EnrollmentsListResponseDto, EnrollmentStatus } from './dto/enrollment-detail.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { AdminRateCourseDto } from './dto/admin-add-review.dto';

// Define allowed periods for validation
enum StatsPeriod {
  YEARLY = 'yearly',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
}
enum StatsType {
  COURSES = 'courses',
  STUDENTS = 'students',
  INSTRUCTORS = 'instructors',
}
export enum GenderFilter {
  ALL = 'all',
  MALE = 'male',
  FEMALE = 'female',
}

@ApiBearerAuth('access_token')
@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:dashboard')
  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getDashboardStats(): Promise<any> {
    return this.adminService.getDashboardStats();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:students:list')
  @Get('students')
  @ApiOperation({ summary: 'Get all students in the system' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)'
  })
  @ApiResponse({
    status: 200,
    description: 'List of students retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllStudents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<any> {
    return this.adminService.getAllStudents(page, limit);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:courses:overview')
  @Get('courses/overview')
  @ApiOperation({ summary: 'Get course overview statistics' })
  @ApiResponse({
    status: 200,
    description: 'Course overview statistics retrieved successfully',
  })
  async getCourseOverview(): Promise<any> {
    return this.adminService.getCourseOverview();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:courses:weekly-sales')
  @Get('courses/weekly-sales')
  @ApiOperation({ summary: 'Retrieve weekly course sales and earnings data.' })
  async getWeeklySales() {
    return this.adminService.getWeeklySales();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:instructors:top')
  @Get('instructors/top')
  @ApiOperation({ summary: 'Retrieve data for the “Top Instructors” section.' })
  async getTopInstructorsAnalytics() {
    return this.adminService.getTopInstructorsAnalytics();
  }

  // New Endpoint for Time-Series Statistics
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:dashboard:time-series')
  @Get('stats/time-series')
  @ApiOperation({ summary: 'Get time-series statistics (Courses, Students, or Instructors) over a period.' })
  @ApiQuery({
    name: 'period',
    required: true,
    enum: StatsPeriod,
    description: 'The aggregation period (yearly, monthly, or weekly)',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: StatsType,
    description: 'The type of entity to count (courses, students, or instructors)',
  })
  @ApiResponse({
    status: 200,
    description: 'Time-series statistics retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid period or type requested.',
  })
  async getTimeSeriesStats(
    @Query('period') period: StatsPeriod,
    @Query('type') type: StatsType,
  ): Promise<any> {
    if (!Object.values(StatsPeriod).includes(period as StatsPeriod)) {
      throw new BadRequestException('Invalid period. Must be yearly, monthly, or weekly.');
    }
    if (!Object.values(StatsType).includes(type as StatsType)) {
      throw new BadRequestException('Invalid type. Must be courses, students, or instructors.');
    }

    return this.adminService.getTimeSeriesStats(period, type);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:instructors:list') // Requires new permission
  @Get('instructors')
  @ApiOperation({ summary: 'Get all instructors in the system, paginated and searchable by name' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term to filter instructors by first or last name'
  })
  @ApiResponse({
    status: 200,
    description: 'List of instructors retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllInstructors(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ): Promise<any> {
    return this.adminService.getAllInstructors(page, limit, search);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:students:overview')
  @Get('students/overview')
  @ApiOperation({ summary: 'Get total students, courses, enrollments, and time-series data for the dashboard.' })
  @ApiQuery({
    name: 'period',
    required: true,
    enum: StatsPeriod,
    description: 'The aggregation period for time-series data (yearly, monthly, or weekly)',
  })
  @ApiResponse({ status: 200, description: 'Student overview stats retrieved successfully.' })
  async getStudentOverview(
    @Query('period') period: StatsPeriod,
  ): Promise<any> {
    if (!Object.values(StatsPeriod).includes(period as StatsPeriod)) {
      throw new BadRequestException('Invalid period. Must be yearly, monthly, or weekly.');
    }
    // We will implement a new service method for this combined stat fetch
    return this.adminService.getStudentOverviewStats(period);
  }

  // -----------------------------------------------------------------
  // 🟢 NEW: STUDENT GEOGRAPHIC STATS (SECTION 2)
  // -----------------------------------------------------------------
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:students:geo-stats')
  @Get('students/geo-stats')
  @ApiOperation({ summary: 'Get student distribution aggregated by country/state.' })
  @ApiResponse({ status: 200, description: 'Geographic statistics retrieved successfully.' })
  async getStudentGeoStats(): Promise<any> {
    return this.adminService.getStudentGeoStats();
  }

  // -----------------------------------------------------------------
  // 🟢 MODIFIED: DETAILED STUDENTS LIST (SECTION 3)
  // -----------------------------------------------------------------
  // Note: We use the existing path /students-information but update the query parameters
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:students:list:detailed')
  @Get('students-information')
  @ApiOperation({ summary: 'Get detailed, filterable list of students with pagination.' })
  @ApiQuery({
    name: 'page', required: false, type: Number, description: 'Page number (default: 1)'
  })
  @ApiQuery({
    name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)'
  })
  @ApiQuery({
    name: 'search', required: false, type: String, description: 'Filter by name or email.'
  })
  @ApiQuery({
    name: 'minAge', required: false, type: Number, description: 'Filter by minimum age.'
  })
  @ApiQuery({
    name: 'maxAge', required: false, type: Number, description: 'Filter by maximum age.'
  })
  @ApiQuery({
    name: 'gender', required: false, enum: GenderFilter, description: 'Filter by gender.'
  })
  @ApiQuery({
    name: 'category', required: false, type: String, description: 'Filter by Profile Category name or ID.'
  })
  @ApiQuery({
    name: 'speciality', required: false, type: String, description: 'Filter by Profile Speciality name or ID.'
  })
  @ApiResponse({ status: 200, description: 'Detailed list of students retrieved successfully.' })
  async getAllStudentsInformation(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('minAge') minAgeStr?: string,
    @Query('maxAge') maxAgeStr?: string,
    @Query('gender') gender?: GenderFilter,
    @Query('category') category?: string,
    @Query('speciality') speciality?: string,
  ): Promise<any> {
    // Convert to number after checking for undefined/null/empty string
    const minAge = minAgeStr ? parseInt(minAgeStr, 10) : undefined;
    const maxAge = maxAgeStr ? parseInt(maxAgeStr, 10) : undefined;

    // 🛑 FIX: Simplify the validation check to only check the PARSED number
    // The previous check was comparing the original string/number input.
    if ((minAge !== undefined && isNaN(minAge)) || (maxAge !== undefined && isNaN(maxAge))) {
      throw new BadRequestException('minAge and maxAge must be numbers.');
    }

    // Also, ensure minAge is not greater than maxAge, if both are present
    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
      throw new BadRequestException('minAge cannot be greater than maxAge.');
    }

    return this.adminService.getAllStudentsInformation(
      page, limit, search,
      minAge, // Pass the parsed number
      maxAge, // Pass the parsed number
      gender, category, speciality
    );
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:quizzes:list') // Requires a new quiz listing permission
  @Get('quizzes')
  @ApiOperation({ summary: 'Get a paginated list of all quizzes with aggregated stats for admin dashboard.' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)'
  })
  async getAllQuizzesForAdmin(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ quizzes: any; pagination: any }> {
    return this.adminService.getAllQuizzesForAdmin(page, limit);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:enrollments:overview')
  @Get('enrollments/overview')
  @ApiOperation({ summary: 'Get overall enrollment statistics' })
  @ApiQuery({
    name: 'period',
    required: true,
    enum: StatsPeriod,
    description: 'The aggregation period for time-series data (yearly, monthly, or weekly)',
  })
  @ApiOkResponse({
    description: 'Enrollment overview metrics calculated successfully',
  })
  async getEnrollmentsOverview(@Query('period') period: StatsPeriod,): Promise<any> {
    if (!Object.values(StatsPeriod).includes(period as StatsPeriod)) {
      throw new BadRequestException('Invalid period. Must be yearly, monthly, or weekly.');
    }
    return this.adminService.getEnrollmentsOverview(period);
  }

  @Get('enrollments-information')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:enrollments:list:detailed')
  @ApiOperation({ summary: 'Get detailed, paginated list of all enrollments with calculated status and progress.' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 100)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by student name, email, or course name',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: EnrollmentStatus,
    description: 'Filter by enrollment status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter enrollments from this date (ISO format: YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter enrollments until this date (ISO format: YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
    type: EnrollmentsListResponseDto,
  })
  async getAllEnrollments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('status') status?: EnrollmentStatus,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ): Promise<EnrollmentsListResponseDto> {
    // Parse and validate dates
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) {
      startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid startDate format. Use YYYY-MM-DD');
      }
    }

    if (endDateStr) {
      endDate = new Date(endDateStr);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid endDate format. Use YYYY-MM-DD');
      }
    }

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    return this.adminService.getAllEnrollments(
      page,
      limit,
      search,
      status,
      startDate,
      endDate,
    );
  }

  // -----------------------------------------------------------------
  // 🟢 NEW: CREATE STUDENT ENDPOINT
  // -----------------------------------------------------------------
  @Post('students')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:students:create') // Requires new permission
  @ApiOperation({ summary: 'Create a new student user and optionally enroll them in courses.' })
  @ApiBody({ type: CreateStudentDto })
  @ApiResponse({
    status: 201,
    description: 'Student user and profile created successfully, and enrollments processed.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g., email already in use, invalid course ID).',
  })
  async createStudent(@Body() createStudentDto: CreateStudentDto): Promise<any> {

    return this.adminService.createStudent(
      createStudentDto,
    );
  }

  // -----------------------------------------------------------------
  // 🟢 NEW: RATE COURSE ENDPOINT (Updated path and logic)
  // -----------------------------------------------------------------
  @Post('add-review') // 👈 UPDATED PATH
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('admin:courses:rate')
  @ApiOperation({ summary: 'Admin rates a course and adds a review on behalf of a student.' })
  @ApiBody({ type: AdminRateCourseDto }) // Body now contains courseId, studentId, rating, review
  @ApiResponse({
    status: 201,
    description: 'Course rated successfully and average rating updated.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g., student not enrolled, invalid IDs).',
  })
  async adminRateCourse(
    @Body() rateCourseDto: AdminRateCourseDto, // Extract all data from the body
  ): Promise<any> {
    const { courseId, studentId, rating, review } = rateCourseDto; // Destructure the needed fields

    return this.adminService.adminRateCourse(
      courseId, // Pass courseId from the body
      studentId,
      rating,
      review,
    );
  }

  // ---
  // 🟢 IDENTITY VERIFICATION ENDPOINTS
  // ---

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:identity:list') // Requires new permission
  @Get('identity')
  @ApiOperation({
    summary: 'List all identity verification submissions',
    description: 'Admin endpoint to retrieve a list of all identity verification submissions, with optional filtering by status.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: IdentityVerificationStatus,
    description: 'Filter submissions by status (pending, approved, rejected).'
  })
  @ApiResponse({ status: 200, description: 'List of identity verification submissions retrieved successfully.' })
  async listIdentitySubmissions(
    @Query('status') status?: IdentityVerificationStatus,
  ): Promise<any> {
    if (status && !Object.values(IdentityVerificationStatus).includes(status)) {
      throw new BadRequestException('Invalid status filter. Must be pending, approved, or rejected.');
    }
    return this.adminService.listIdentitySubmissions(status);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:identity:approve') // Requires new permission
  @Post('identity/:id/approve')
  @ApiOperation({
    summary: 'Approve an identity verification submission',
    description: 'Approves the submission, setting the user\'s isIdentityVerified and isVerified status to true.',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID of the Identity Verification submission' })
  @ApiResponse({ status: 200, description: 'Identity verification approved. User status updated.' })
  async approveIdentity(@Param('id') submissionId: string, @Req() req) {
    await this.adminService.approveIdentitySubmission(submissionId, req.user.sub);
    return { message: 'Identity verification approved. User status updated.' };
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:identity:reject') // Requires new permission
  @Post('identity/:id/reject')
  @ApiOperation({
    summary: 'Reject an identity verification submission',
    description: 'Rejects the submission, setting the user\'s isIdentityVerified and isVerified status to false and storing the reason.',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID of the Identity Verification submission' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rejectionReason: { type: 'string', example: 'Document blurry or expired.', description: 'The reason for rejection.' },
      },
      required: ['rejectionReason'],
    },
  })
  @ApiResponse({ status: 200, description: 'Identity verification rejected.' })
  async rejectIdentity(
    @Param('id') submissionId: string,
    @Body() rejectIdentityDto: RejectIdentityDto,
    @Req() req
  ) {
    if (!rejectIdentityDto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required.');
    }
    await this.adminService.rejectIdentitySubmission(
      submissionId,
      rejectIdentityDto.rejectionReason,
      req.user.sub
    );
    return { message: 'Identity verification rejected. User status updated.' };
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:user:set_verified') // Admin manual override permission
  @Patch('identity/:userId/is-verified')
  @ApiOperation({
    summary: 'Admin manual override for user overall verification status',
    description: 'Allows an administrator to manually set the overall isVerified status for a user (true/false). This bypasses email and identity checks.',
  })
  @ApiParam({ name: 'userId', type: String, description: 'UUID of the User' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isVerified: { type: 'boolean', example: true, description: 'The new overall verification status.' },
      },
      required: ['isVerified'],
    },
  })
  @ApiResponse({ status: 200, description: 'User overall verification status manually updated.' })
  async adminSetIsVerified(
    @Param('userId') userId: string,
    @Body('isVerified') isVerified: boolean,
  ) {
    // Note: NestJS should handle the type coercion for simple boolean values from JSON body,
    // but explicit type check is robust.
    if (typeof isVerified !== 'boolean') {
      throw new BadRequestException('The body must contain a boolean value for isVerified.');
    }
    await this.adminService.adminSetIsVerified(userId, isVerified);
    return { message: `User overall verification status manually set to ${isVerified}.` };
  }
}
