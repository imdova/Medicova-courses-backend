import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
  Post,
  Delete,
  Body,
  NotFoundException,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';
import { StudentCourseService } from './student-course.service';
import { Course, CourseLevel, CourseType } from './entities/course.entity';
import { CourseStudent } from './entities/course-student.entity';
import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { PaymentService } from 'src/payment/payment.service';
import { OrderType } from 'src/payment/entities/payment.entity';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { OptionalJwtAuthGuard } from '../auth/strategy/optional-jwt-auth.guard';

// Define the custom parameters interface for type safety
interface CourseFilterParams {
  categories?: string | string[];
  subcategories?: string | string[];
  languages?: string | string[];
  durations?: string | string[];
  priceFrom?: string; // Keep as string here, parse to number in service
  priceTo?: string;   // Keep as string here, parse to number in service
}

@ApiTags('Student Courses')
@Controller('student/courses')
export class StudentCourseController {
  constructor(
    private readonly studentCourseService: StudentCourseService,
    private readonly paymentService: PaymentService,
  ) { }

  @Post(':id/enroll')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:enroll')
  @ApiOperation({
    summary: 'Enroll student into a course',
    description: 'Allows the authenticated student to enroll in a course.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the course to enroll in',
    type: String,
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully enrolled into course',
    type: CourseStudent,
  })
  @ApiResponse({
    status: 400,
    description: 'Already enrolled or invalid request',
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  enroll(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.studentCourseService.enroll(id, req.user.sub);
  }

  @Post(':id/purchase')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:purchase')
  @ApiOperation({ summary: 'Purchase a course' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Payment request created' })
  @ApiResponse({ status: 400, description: 'Invalid purchase request' })
  purchaseCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
    @Body() body: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment({
      ...body,
      userId: req.user.sub,
      orderId: id, // overwrite orderId from the route param
      orderType: OrderType.COURSE,
    });
  }

  @Post(':id/favorite')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:favorite')
  @ApiOperation({
    summary: 'Add or remove a course from favorites',
    description: 'Allows the authenticated student to favorite or unfavorite a course.',
  })
  @ApiResponse({ status: 200, description: 'Favorite toggled successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  toggleFavorite(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.studentCourseService.toggleFavorite(id, req.user.sub);
  }

  @Get('latest')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:get_latest_for_student')
  @ApiOperation({
    summary: 'Get latest studied course for a student',
    description:
      'Returns the most recently interacted-with course for the authenticated student.',
  })
  @ApiResponse({
    status: 200,
    description: 'Latest studied course details',
    type: Course,
  })
  @ApiResponse({ status: 404, description: 'No course progress found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getLatestStudiedCourse(@Req() req) {
    const course = await this.studentCourseService.getLatestStudiedCourse(req.user.sub);
    if (!course) {
      throw new NotFoundException('No recent course activity found');
    }
    return course;
  }

  @Get('enrolled')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:list_enrolled')
  @ApiOperation({
    summary: 'Get paginated list of courses the student is enrolled in',
    description:
      'Returns a paginated list of courses the authenticated student is enrolled in. Pricings are automatically filtered based on the student’s nationality.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of enrolled courses',
    type: [Course],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getEnrolledCourses(@Paginate() query: PaginateQuery, @Req() req) {
    return this.studentCourseService.getEnrolledCourses(query, req.user.sub);
  }

  @Get('favorites')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:list_favorites')
  @ApiOperation({
    summary: 'Get all favorite courses for the authenticated student',
    description: 'Returns a list of all courses the student has favorited.',
  })
  @ApiResponse({ status: 200, description: 'List of favorite courses', type: [Course] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getFavorites(@Req() req) {
    return this.studentCourseService.getFavoriteCourses(req.user.sub);
  }

  @Get('activity')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:get_student_activity')
  @ApiOperation({
    summary: 'Get activity statistics for the authenticated student',
    description:
      'Returns statistics for the authenticated student including courses in progress, completed courses, and community participation.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async getMyActivity(@Req() req) {
    return this.studentCourseService.getStudentActivity(req.user.sub);
  }

  @Get('enrolled/related')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:list_related_for_enrolled')
  @ApiOperation({
    summary: 'Get related courses based on the student’s enrolled courses',
    description:
      'Returns a smart list of recommended courses based on the student’s enrolled courses (category, subcategory, tags, and name similarity).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of related courses',
    type: [Course],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  getRelatedCoursesForEnrolled(@Req() req) {
    return this.studentCourseService.getRelatedCoursesForEnrolled(req.user.sub);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  //@RequirePermissions('course:list_available')
  @ApiOperation({
    summary: 'Get paginated list of available courses for students',
    description:
      'Returns a paginated list of courses. Pricings are automatically filtered based on the student’s nationality.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of student courses',
    type: [Course], // optionally wrap in a PaginatedCourseDto
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  // 1. Array filters (handled custom in service logic)
  @ApiQuery({
    name: 'categories',
    required: false,
    type: [String],
    description: 'Filter by one or more course category names (e.g., category=Web Dev,category=Design). Sent as a comma-separated list in query params or repeated params.',
    style: 'form',
    explode: false,
  })
  @ApiQuery({
    name: 'subcategories',
    required: false,
    type: [String],
    description: 'Filter by one or more course subcategory names.',
    style: 'form',
    explode: false,
  })
  @ApiQuery({
    name: 'languages',
    required: false,
    type: [String],
    description: 'Filter by one or more supported languages (e.g., languages=English,languages=Arabic).',
    style: 'form',
    explode: false,
  })
  @ApiQuery({
    name: 'durations',
    required: false,
    type: [String],
    description: 'Filter by course duration ranges. Available values: less2Hours, 2_10Hours, 1_4Weeks, 1_3Months, 3_6Months, more6Months',
    style: 'form',
    explode: false,
  })

  // 2. Price Range filters (handled custom in service logic)
  @ApiQuery({
    name: 'priceFrom',
    required: false,
    type: Number,
    description: 'Filter courses priced greater than or equal to this amount.',
  })
  @ApiQuery({
    name: 'priceTo',
    required: false,
    type: Number,
    description: 'Filter courses priced less than or equal to this amount.',
  })

  // 3. Simple filters (handled via nestjs-paginate and column name)
  // Note: For nestjs-paginate to work, the filter name here must match the key in filterableColumns (e.g., 'type', 'level')

  @ApiQuery({
    name: 'filter.type',
    required: false,
    enum: CourseType,
    description: 'Filter by course type (recorded, live, etc.). Corresponds to filterableColumns key "type".',
  })
  @ApiQuery({
    name: 'filter.level',
    required: false,
    enum: CourseLevel,
    description: 'Filter by course difficulty level (beginner, intermediate, advanced). Corresponds to filterableColumns key "level".',
  })
  @ApiQuery({
    name: 'filter.isCourseFree',
    required: false,
    description: 'Filter by whether the course is free or paid',
  })
  // Average Rating uses the GTE (>=) operator in your config
  @ApiQuery({
    name: 'filter.averageRating',
    required: false,
    type: Number,
    description: 'Filter by minimum average rating (e.g., filter.averageRating=$gte:4.5). Corresponds to filterableColumns key "averageRating".',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Sort courses by field and direction. Format: sortBy=field:ASC|DESC. Available fields: created_at, effectivePrice, averageRating. Examples: sortBy=effectivePrice:ASC (price low to high), sortBy=averageRating:DESC (rating high to low), sortBy=created_at:DESC (newest first). For multiple sorts, use multiple sortBy parameters.',
    examples: {
      'Sort by Price Low to High': {
        value: 'sortBy=effectivePrice:ASC'
      },
      'Sort by Price High to Low': {
        value: 'sortBy=effectivePrice:DESC'
      },
      'Sort by Rating High to Low': {
        value: 'sortBy=averageRating:DESC'
      },
      'Sort by Rating Low to High': {
        value: 'sortBy=averageRating:ASC'
      },
      'Sort by Newest First': {
        value: 'sortBy=created_at:DESC'
      },
      'Sort by Oldest First': {
        value: 'sortBy=created_at:ASC'
      }
    }
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Global search term applied to name, tags, and metadata fields.',
    example: 'programming',
  })
  findAll(@Paginate() query: PaginateQuery, @Req() req, @Query() customFilters: CourseFilterParams) {
    return this.studentCourseService.getPaginatedCourses(query, req.user, customFilters);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Get all available course filters with counts' })
  @ApiResponse({
    status: 200,
    description: 'Course filters with counts',
    schema: {
      example: {
        categories: [
          { name: "Development", slug: "development", count: 24 },
          { name: "Design", slug: "design", count: 15 }
        ],
        subcategories: [
          { name: "Web Development", slug: "web-development", count: 14 },
          { name: "UI/UX", slug: "ui-ux", count: 6 }
        ],
        languages: [
          { name: "English", code: "en", count: 20 },
          { name: "Arabic", code: "ar", count: 10 }
        ],
        courseTypes: [
          { type: "live", count: 5 },
          { type: "recorded", count: 25 }
        ],
        courseLevels: [
          { level: "beginner", count: 12 },
          { level: "intermediate", count: 10 }
        ],
        durations: [
          { label: "Less Than 2 Hours", value: "less2Hours", count: 61 },
          { label: "1-4 Weeks", value: "1_4Weeks", count: 20 },
          { label: "1-3 Months", value: "1_3Months", count: 14 },
          { label: "3-6 Months", value: "3_6Months", count: 6 }
        ],
        ratings: [
          { rating: 5, count: 9 },
          { rating: 4, count: 14 }
        ],
        price_range: [
          { "currency": "EGP", "min": 10, "max": 500 }, // Price range for EGP
          { "currency": "USD", "min": 5, "max": 100 }  // Price range for USD
        ],
        free: {
          count: 5
        }
      }
    }
  })
  async getCourseFilters(): Promise<any> {
    return this.studentCourseService.getCourseFiltersSingleQuery();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:get_for_student')
  @ApiOperation({
    summary: 'Get a course by ID for student view',
    description:
      'Fetches a course by its UUID. Pricings are filtered to only return the one matching the student’s nationality.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the course',
    type: String,
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @ApiResponse({
    status: 200,
    description: 'Course details found',
    type: Course,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.studentCourseService.findOne(id, req.user);
  }

  @Delete(':id/drop')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('course:drop')
  @ApiOperation({
    summary: 'Drop a course',
    description:
      'Allows the authenticated student to drop (unenroll from) a course they are currently enrolled in.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the course to drop',
    type: String,
    example: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully dropped the course',
  })
  @ApiResponse({ status: 404, description: 'Course not found or not enrolled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  drop(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.studentCourseService.drop(id, req.user.sub);
  }
}
