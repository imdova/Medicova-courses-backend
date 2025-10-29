import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
  Req,
  ForbiddenException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Course } from './entities/course.entity';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { UpdateCourseDto } from './dto/update-course.dto';
import { RateCourseDto } from './dto/rate-course.dto';

@ApiTags('Courses')
@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) { }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:create')
  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({
    status: 201,
    description: 'The course has been successfully created.',
    type: CreateCourseDto,
  })
  create(@Body() createCourseDto: CreateCourseDto, @Req() req) {
    const userId = req.user.sub; // Get user ID from the request
    const academyId = req.user.academyId;
    // Check if user is admin if he wants to assign course to another instructor
    if (createCourseDto.instructorId && req.user.role !== 'admin') {
      throw new ForbiddenException(
        'You are not permitted to assign this course to another instructor.',
      );
    }
    // ✅ block if instructor is not verified
    if (
      req.user.role === 'instructor' &&
      !req.user.isEmailVerified &&
      createCourseDto.status === 'published'
    ) {
      throw new ForbiddenException(
        'You must verify your email before publishing a course.',
      );
    }
    return this.courseService.create(createCourseDto, userId, academyId);
  }

  @Post(':courseId/rating')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiOperation({ summary: 'Add or update a rating and review for a course' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course' })
  @ApiBody({ type: RateCourseDto })
  @ApiResponse({ status: 201, description: 'Rating added/updated successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async rateCourse(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: RateCourseDto,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.courseService.rateCourse(courseId, userId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:list')
  @ApiOperation({
    summary: 'Get paginated list of courses with filters and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of courses',
    type: [Course], // you may want to create a PaginatedCourseDto for better Swagger docs
  })
  @ApiQuery({
    name: 'filter.name',
    required: false,
    description: 'Search by course name (ILIKE). Example value: `$ilike:math`',
    example: '$ilike:math',
  })
  @ApiQuery({
    name: 'filter.category.name',
    required: false,
    description:
      'Search by category name (ILIKE). Example value: `$ilike:science`',
    example: '$ilike:science',
  })
  @ApiQuery({
    name: 'filter.status',
    required: false,
    description: 'Filter by course status (EQ). Example value: `$eq:draft`',
    example: '$eq:draft',
  })
  @ApiQuery({
    name: 'filter.isActive',
    required: false,
    description:
      'Filter by active flag (EQ). Example value: `$eq:true` or `$eq:false`',
    example: '$eq:true',
  })
  @ApiQuery({
    name: 'filter.isCourseFree',
    required: false,
    description: 'Filter by free/paid flag (EQ). Example value: `$eq:true`',
    example: '$eq:true',
  })
  @ApiQuery({
    name: 'filter.pricings.salePrice',
    required: false,
    description:
      'Filter by sale price (GTE/LTE). Example values: `$gte:100`, `$lte:500`',
    example: '$gte:100',
  })
  @ApiQuery({
    name: 'filter.pricings.currencyCode',
    required: false,
    description: 'Filter by currency code (EQ). Example value: `$eq:USD`',
    example: '$eq:USD',
  })
  findAll(
    @Paginate() query: PaginateQuery,
    @Req() req,
  ): Promise<Paginated<Course>> {
    const userId = req.user.sub;
    const academyId = req.user.academyId;
    const role = req.user.role;
    return this.courseService.getPaginatedCourses(
      query,
      userId,
      academyId,
      role,
    );
  }

  @Get('public')
  @ApiOperation({
    summary:
      'Get all published and active courses by instructor or academy (public endpoint)',
  })
  @ApiQuery({
    name: 'instructorId',
    required: false,
    description: 'Filter by instructor UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'academyId',
    required: false,
    description: 'Filter by academy UUID',
    example: '770e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'List of published and active courses',
    type: [Course],
  })
  @ApiResponse({
    status: 400,
    description: 'Missing or invalid query parameters',
  })
  async getPublicCourses(
    @Paginate() query: PaginateQuery,
    @Query('instructorId') instructorId?: string,
    @Query('academyId') academyId?: string,
  ) {
    if ((!instructorId && !academyId) || (instructorId && academyId)) {
      throw new BadRequestException(
        'You must provide either instructorId or academyId (but not both)',
      );
    }

    return this.courseService.getPublicCourses(query, instructorId, academyId);
  }

  @Get('tags')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:tags')
  @ApiOperation({ summary: 'Get all available course tags' })
  @ApiResponse({
    status: 200,
    description: 'List of all course tags',
    type: [String],
  })
  getTags() {
    return this.courseService.getAllTags();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:get_by_id')
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the course' })
  @ApiResponse({
    status: 200,
    description: 'Course found',
    type: CreateCourseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.courseService.findOne(
      id,
      req.user.sub,
      req.user.academyId,
      req.user.role,
    );
  }

  @Get(':courseId/ratings')
  @ApiOperation({ summary: 'Get all ratings and reviews for a course' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course' })
  @ApiResponse({
    status: 200,
    description: 'List of ratings and reviews for the course',
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourseRatings(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.courseService.getCourseRatings(courseId);
  }

  @Get('slug/:slug')
  //@RequirePermissions('course:get_by_slug')
  @ApiOperation({ summary: 'Get a course by Slug' })
  @ApiParam({ name: 'slug', description: 'Slug of course' })
  @ApiResponse({
    status: 200,
    description: 'Course found',
    type: CreateCourseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findOneBySlug(@Param('slug') slug: string) {
    return this.courseService.findOneBySlug(slug);
  }

  @Get(':courseId/students/progress')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:students_progress')
  @ApiOperation({
    summary: 'Get progress of all students in a course (teacher view)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns progress summary for all students in the course',
  })
  async getAllStudentsProgress(@Param('courseId') courseId: string) {
    return this.courseService.getAllStudentsProgress(courseId);
  }

  // 🟢 UPDATED ENDPOINT 1: Course Overview Statistics
  @Get(':courseId/overview')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('course:overview') // New permission
  @ApiOperation({ summary: 'Get overview stats and time-series enrollment data for a specific course' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course' })
  @ApiQuery({
    name: 'period',
    required: true,
    enum: ['yearly', 'monthly', 'weekly'], // Using string array for Swagger
    description: 'The aggregation period for enrollment time-series data (yearly, monthly, or weekly)',
  })
  @ApiResponse({
    status: 200,
    description: 'Course overview data',
    schema: {
      example: {
        totalEnrollments: 200,
        completionRate: 76,
        enrollmentTimeSeries: [{ date: '2024-05-01', count: 15 }, /* ... */], // New return structure
      },
    },
  })
  async getCourseOverview(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query('period') period: string, // Capture the period query parameter
    @Req() req,
  ) {
    // Input Validation
    const allowedPeriods = ['yearly', 'monthly', 'weekly'];
    if (!allowedPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Must be yearly, monthly, or weekly.');
    }

    const { sub: userId, academyId, role } = req.user;
    return this.courseService.getCourseOverview(
      courseId,
      userId,
      academyId,
      role,
      period, // Pass the period to the service
    );
  }

  // 🟢 UPDATED ENDPOINT 2: Course Demographic Statistics
  @Get(':courseId/stats')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('course:stats')
  @ApiOperation({ summary: 'Get demographic stats (countries, categories, ages) for a specific course, grouped by a chosen field.' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course' })
  @ApiQuery({
    name: 'groupBy',
    required: true,
    enum: ['country', 'category', 'age'], // Allowed grouping fields
    description: 'The field to group the student statistics by (country, category, or age)',
  })
  @ApiResponse({
    status: 200,
    description: 'Course demographic stats',
    schema: {
      example: {
        // The structure will adapt based on 'groupBy'
        stats: [
          { groupValue: 'United States', students: 120, completion: 78 },
          { groupValue: 'India', students: 95, completion: 72 },
        ],
      },
    },
  })
  async getCourseStats(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Query('groupBy') groupBy: string, // Capture the groupBy query parameter
    @Req() req,
  ) {
    // Input Validation
    const allowedGroupings = ['country', 'category', 'age'];
    if (!allowedGroupings.includes(groupBy)) {
      throw new BadRequestException('Invalid groupBy parameter. Must be country, category, or age.');
    }

    const { sub: userId, academyId, role } = req.user;
    return this.courseService.getCourseStats(
      courseId,
      userId,
      academyId,
      role,
      groupBy, // Pass the grouping field to the service
    );
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:update')
  @ApiOperation({ summary: 'Update a course by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the course' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({
    status: 200,
    description: 'Course updated successfully',
    type: CreateCourseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdateCourseDto,
    @Req() req,
  ) {
    // Check if user is admin if he wants to assign course to another instructor
    if (updateData.instructorId && req.user.role !== 'admin') {
      throw new ForbiddenException(
        'You are not permitted to assign this course to another instructor.',
      );
    }
    if (
      req.user.role === 'instructor' &&
      !req.user.isEmailVerified &&
      updateData.status === 'published'
    ) {
      throw new ForbiddenException(
        'You must verify your email before publishing a course.',
      );
    }
    return this.courseService.update(
      id,
      updateData,
      req.user.sub,
      req.user.academyId,
      req.user.role,
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:delete')
  @ApiOperation({ summary: 'Soft delete a course by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the course' })
  @ApiResponse({ status: 204, description: 'Course soft deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    await this.courseService.softDelete(
      id,
      req.user.sub,
      req.user.academyId,
      req.user.role,
    );
  }
}
