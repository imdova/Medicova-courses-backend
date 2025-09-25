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
} from '@nestjs/common';
import { CourseSectionService } from './course-section.service';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';
import { UpdateCourseSectionDto } from './dto/update-course-section.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { CourseSection } from './entities/course-section.entity';
import { CreateMultipleSectionsWithItemsDto } from './dto/create-sections-with-items.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { UpdateMultipleSectionsWithItemsDto } from './dto/update-sections-with-items.dto';

@ApiTags('Course Sections')
@Controller('courses/:courseId/course-sections')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CourseSectionController {
  constructor(private readonly service: CourseSectionService) { }

  @Post()
  @RequirePermissions('section:create')
  @ApiOperation({ summary: 'Create a new course section' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course' })
  @ApiBody({ type: CreateCourseSectionDto })
  @ApiResponse({
    status: 201,
    description: 'Section created successfully',
    type: CourseSection,
  })
  createSection(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateCourseSectionDto,
  ) {
    return this.service.createSection(courseId, dto);
  }

  @Post('with-items/bulk')
  @RequirePermissions('section:create_multiple')
  @ApiOperation({ summary: 'Create multiple course sections with items' })
  @ApiBody({ type: CreateMultipleSectionsWithItemsDto })
  async createMultipleSectionsWithItems(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateMultipleSectionsWithItemsDto,
  ) {
    return this.service.createMultipleSectionsWithItems(courseId, dto.sections);
  }

  @Get()
  @RequirePermissions('section:list')
  @ApiOperation({ summary: 'Get all sections for a course' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course' })
  @ApiResponse({
    status: 200,
    description: 'List of course sections',
    type: [CourseSection],
  })
  getSections(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.service.getSectionsByCourse(courseId);
  }

  @Patch(':sectionId')
  @RequirePermissions('section:update')
  @ApiOperation({ summary: 'Update a course section' })
  @ApiParam({ name: 'sectionId', description: 'UUID of the section' })
  @ApiBody({ type: UpdateCourseSectionDto })
  @ApiResponse({
    status: 200,
    description: 'Section updated successfully',
    type: CourseSection,
  })
  updateSection(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateCourseSectionDto,
  ) {
    return this.service.updateSection(sectionId, dto);
  }

  @Patch('with-items/bulk')
  @RequirePermissions('section:update_multiple')
  @ApiOperation({
    summary: 'Update multiple course sections with items',
    description: 'Updates existing sections and items (by ID) or creates new ones if ID is not provided'
  })
  @ApiParam({ name: 'courseId', description: 'UUID of the course' })
  @ApiBody({ type: UpdateMultipleSectionsWithItemsDto })
  @ApiResponse({
    status: 200,
    description: 'Sections updated successfully',
    type: [CourseSection],
  })
  async updateMultipleSectionsWithItems(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpdateMultipleSectionsWithItemsDto,
  ) {
    return this.service.updateMultipleSectionsWithItems(courseId, dto.sections);
  }

  @Delete(':sectionId')
  @RequirePermissions('section:delete')
  @ApiOperation({ summary: 'Soft delete a course section' })
  @ApiParam({ name: 'sectionId', description: 'UUID of the section' })
  @ApiResponse({ status: 204, description: 'Section deleted successfully' })
  softDeleteSection(@Param('sectionId', ParseUUIDPipe) sectionId: string) {
    return this.service.removeSection(sectionId);
  }
}
