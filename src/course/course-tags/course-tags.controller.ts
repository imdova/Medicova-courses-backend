import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CourseTagsService } from './course-tags.service';
import { CreateCourseTagDto } from './dto/create-course-tag.dto';
import { UpdateCourseTagDto } from './dto/update-course-tag.dto';
import { PermissionsGuard } from '../../auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { CourseTag } from './entities/course-tags.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Course Tags') // Tags the controller for grouping in Swagger UI
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('course-tags')
export class CourseTagsController {
  constructor(private readonly courseTagsService: CourseTagsService) { }

  // --- POST /course-tags ---
  @Post()
  @ApiOperation({ summary: 'Create a new course tag (Admin only)' })
  @ApiResponse({ status: 201, description: 'The tag has been successfully created.', type: CourseTag })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Tag name or slug already exists.' })
  @ApiBody({ type: CreateCourseTagDto, description: 'Data for creating a new tag' })
  create(@Body() createCourseTagDto: CreateCourseTagDto): Promise<CourseTag> {
    return this.courseTagsService.create(createCourseTagDto);
  }

  // --- GET /course-tags ---
  @Get()
  @ApiOperation({ summary: 'Get all active course tags' })
  @ApiResponse({ status: 200, description: 'List of all course tags.', type: [CourseTag] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(): Promise<CourseTag[]> {
    return this.courseTagsService.findAll();
  }

  // --- GET /course-tags/:id ---
  @Get(':id')
  @ApiOperation({ summary: 'Get a single course tag by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the course tag', type: 'string' })
  @ApiResponse({ status: 200, description: 'The requested course tag.', type: CourseTag })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  findOne(@Param('id') id: string): Promise<CourseTag> {
    return this.courseTagsService.findOne(id);
  }

  // --- PATCH /course-tags/:id ---
  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing course tag (Admin only)' })
  @ApiParam({ name: 'id', description: 'The UUID of the course tag to update', type: 'string' })
  @ApiBody({ type: UpdateCourseTagDto, description: 'Partial data to update the tag' })
  @ApiResponse({ status: 200, description: 'The tag has been successfully updated.', type: CourseTag })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  @ApiResponse({ status: 409, description: 'Updated name or slug already exists.' })
  update(@Param('id') id: string, @Body() updateCourseTagDto: UpdateCourseTagDto): Promise<CourseTag> {
    return this.courseTagsService.update(id, updateCourseTagDto);
  }

  // --- DELETE /course-tags/:id ---
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a course tag by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The UUID of the course tag to delete', type: 'string' })
  @ApiResponse({ status: 200, description: 'Tag successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.courseTagsService.remove(id);
  }
}