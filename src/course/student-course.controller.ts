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
