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
import { OptionalJwtAuthGuard } from '../../auth/strategy/optional-jwt-auth.guard';

@ApiTags('Course Sections')
@Controller('courses/:courseId/course-sections')
export class CourseSectionController {
  constructor(private readonly service: CourseSectionService) { }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  // @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  // @RequirePermissions('section:list')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get all sections for a course' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course' })
  @ApiResponse({
    status: 200,
    description: 'List of course sections',
    type: [CourseSection],
  })
  getSections(@Param('courseId', ParseUUIDPipe) courseId: string, @Req() req) {
    const user = req.user; // User is populated by OptionalJwtAuthGuard, will be null/undefined if unauthenticated

    if (user) {
      // User is authenticated (full access)
      return this.service.getSectionsByCourse(courseId); // Your existing full-data service method
    } else {
      // User is NOT authenticated (public access)
      return this.service.getPublicSectionsByCourse(courseId); // A new service method for public data
    }
  }

  @Patch(':sectionId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('section:delete')
  @ApiOperation({ summary: 'Soft delete a course section' })
  @ApiParam({ name: 'sectionId', description: 'UUID of the section' })
  @ApiResponse({ status: 204, description: 'Section deleted successfully' })
  softDeleteSection(@Param('sectionId', ParseUUIDPipe) sectionId: string) {
    return this.service.removeSection(sectionId);
  }
}
