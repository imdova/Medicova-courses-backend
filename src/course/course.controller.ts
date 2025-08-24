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
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { Course } from './entities/course.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/user/entities/user.entity';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Courses')
@Controller('courses')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new course' })
  @ApiBody({ type: CreateCourseDto })
  @ApiResponse({
    status: 201,
    description: 'The course has been successfully created.',
    type: CreateCourseDto,
  })
  create(@Body() createCourseDto: CreateCourseDto, @Req() req) {
    const userId = req.user.sub; // Get user ID from the request
    return this.courseService.create(createCourseDto, userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of courses with filters and sorting',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of courses',
    type: [Course], // you may want to create a PaginatedCourseDto for better Swagger docs
  })
  findAll(
    @Paginate() query: PaginateQuery,
    @Req() req,
  ): Promise<Paginated<Course>> {
    return this.courseService.getPaginatedCourses(query, req.user.sub);
  }

  @Get('tags')
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
  @ApiOperation({ summary: 'Get a course by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the course' })
  @ApiResponse({
    status: 200,
    description: 'Course found',
    type: CreateCourseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.courseService.findOne(id);
  }

  @Get(':courseId/students/progress')
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

  @Patch(':id')
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
    @Body() updateData: Partial<CreateCourseDto>,
  ) {
    return this.courseService.update(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a course by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the course' })
  @ApiResponse({ status: 204, description: 'Course soft deleted successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    await this.courseService.softDelete(id);
  }
}
