import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
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
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { ImportResult } from './dto/import-course-tags.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Course Tags') // Tags the controller for grouping in Swagger UI
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('course-tags')
export class CourseTagsController {
  constructor(private readonly courseTagsService: CourseTagsService) { }

  // --- POST /course-tags ---
  @Post()
  @RequirePermissions('course-tags:create')
  @ApiOperation({ summary: 'Create a new course tag (Admin only)' })
  @ApiResponse({ status: 201, description: 'The tag has been successfully created.', type: CourseTag })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Tag name or slug already exists.' })
  @ApiBody({ type: CreateCourseTagDto, description: 'Data for creating a new tag' })
  create(@Body() createCourseTagDto: CreateCourseTagDto): Promise<CourseTag> {
    return this.courseTagsService.create(createCourseTagDto);
  }

  // --- POST /course-tags/import ---
  @Post('import')
  @RequirePermissions('course-tags:create_using_file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Bulk import course tags from XLSX/CSV file (Admin only)',
    description: 'Upload a file with columns: name, slug, description, color, isActive'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Import completed with results summary.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 15 },
        failed: { type: 'number', example: 2 },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              row: { type: 'number' },
              name: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or missing file.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async importTags(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Only XLSX and CSV files are allowed.',
      );
    }

    return this.courseTagsService.importFromFile(file);
  }

  // --- GET /course-tags ---
  @Get()
  @RequirePermissions('course-tags:list')
  @ApiOperation({ summary: 'List all course tags with associated course count' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Paginated list of course tags.', type: Paginated<any> })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<any>> {
    return this.courseTagsService.findAll(query);
  }

  // --- GET /course-tags/:id ---
  @Get(':id')
  @RequirePermissions('course-tags:get_by_id')
  @ApiOperation({ summary: 'Get a single course tag by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the course tag', type: 'string' })
  @ApiResponse({ status: 200, description: 'The requested course tag.', type: CourseTag })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  findOne(@Param('id') id: string): Promise<CourseTag> {
    return this.courseTagsService.findOne(id);
  }

  // --- PATCH /course-tags/:id ---
  @Patch(':id')
  @RequirePermissions('course-tags:update')
  @ApiOperation({ summary: 'Update an existing course tag (Admin only)' })
  @ApiParam({ name: 'id', description: 'The UUID of the course tag to update', type: 'string' })
  @ApiBody({ type: CreateCourseTagDto, description: 'Partial data to update the tag' })
  @ApiResponse({ status: 200, description: 'The tag has been successfully updated.', type: CourseTag })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  @ApiResponse({ status: 409, description: 'Updated name or slug already exists.' })
  update(@Param('id') id: string, @Body() updateCourseTagDto: UpdateCourseTagDto): Promise<CourseTag> {
    return this.courseTagsService.update(id, updateCourseTagDto);
  }

  // --- DELETE /course-tags/:id ---
  @Delete(':id')
  @RequirePermissions('course-tags:delete')
  @ApiOperation({ summary: 'Delete a course tag by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The UUID of the course tag to delete', type: 'string' })
  @ApiResponse({ status: 200, description: 'Tag successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.courseTagsService.remove(id);
  }
}