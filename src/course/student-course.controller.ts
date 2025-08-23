import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/user/entities/user.entity';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';
import { StudentCourseService } from './student-course.service';
import { Course } from './entities/course.entity';

@ApiTags('Student Courses')
@Controller('student/courses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentCourseController {
  constructor(private readonly studentCourseService: StudentCourseService) {}

  @Get()
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
}
