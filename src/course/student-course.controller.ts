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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';
import { StudentCourseService } from './student-course.service';
import { Course } from './entities/course.entity';
import { CourseStudent } from './entities/course-student.entity';
import { CreatePaymentDto } from 'src/payment/dto/create-payment.dto';
import { PaymentService } from 'src/payment/payment.service';
import { OrderType } from 'src/payment/entities/payment.entity';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { OptionalJwtAuthGuard } from '../auth/strategy/optional-jwt-auth.guard';

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
  findAll(@Paginate() query: PaginateQuery, @Req() req) {
    return this.studentCourseService.getPaginatedCourses(query, req.user);
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
