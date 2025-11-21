import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { BlogTagsService } from './blog-tags.service';
import { CreateBlogTagDto } from './dto/create-blog-tag.dto';
import { UpdateBlogTagDto } from './dto/update-blog-tag.dto';
import { PermissionsGuard } from '../../auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { BlogTag } from './entities/blog-tag.entity';
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
import { ImportResult } from './dto/import-blog-tags.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Blog Tags') // Tags the controller for grouping in Swagger UI
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('blog-tags')
export class BlogTagsController {
  constructor(private readonly blogTagsService: BlogTagsService) { }

  // --- POST /blog-tags ---
  @Post()
  //@RequirePermissions('blog-tags:create')
  @ApiOperation({ summary: 'Create a new blog tag (Admin only)' })
  @ApiResponse({ status: 201, description: 'The tag has been successfully created.', type: BlogTag })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Tag name or slug already exists.' })
  @ApiBody({ type: CreateBlogTagDto, description: 'Data for creating a new tag' })
  create(@Body() createblogTagDto: CreateBlogTagDto): Promise<BlogTag> {
    return this.blogTagsService.create(createblogTagDto);
  }

  // --- POST /blog-tags/import ---
  @Post('import')
  //@RequirePermissions('blog-tags:create_using_file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Bulk import blog tags from XLSX/CSV file (Admin only)',
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

    return this.blogTagsService.importFromFile(file);
  }

  // --- GET /blog-tags ---
  @Get()
  //@RequirePermissions('blog-tags:list')
  @ApiOperation({ summary: 'List all blog tags with associated blog count' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Paginated list of blog tags.', type: Paginated<any> })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<any>> {
    return this.blogTagsService.findAll(query);
  }

  // --- GET /blog-tags/:id ---
  @Get(':id')
  //@RequirePermissions('blog-tags:get_by_id')
  @ApiOperation({ summary: 'Get a single blog tag by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the blog tag', type: 'string' })
  @ApiResponse({ status: 200, description: 'The requested blog tag.', type: BlogTag })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  findOne(@Param('id') id: string): Promise<BlogTag> {
    return this.blogTagsService.findOne(id);
  }

  // --- PATCH /blog-tags/:id ---
  @Patch(':id')
  //@RequirePermissions('blog-tags:update')
  @ApiOperation({ summary: 'Update an existing blog tag (Admin only)' })
  @ApiParam({ name: 'id', description: 'The UUID of the blog tag to update', type: 'string' })
  @ApiBody({ type: CreateBlogTagDto, description: 'Partial data to update the tag' })
  @ApiResponse({ status: 200, description: 'The tag has been successfully updated.', type: BlogTag })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  @ApiResponse({ status: 409, description: 'Updated name or slug already exists.' })
  update(@Param('id') id: string, @Body() updateblogTagDto: UpdateBlogTagDto): Promise<BlogTag> {
    return this.blogTagsService.update(id, updateblogTagDto);
  }

  // --- DELETE /blog-tags/:id ---
  @Delete(':id')
  //@RequirePermissions('blog-tags:delete')
  @ApiOperation({ summary: 'Delete a blog tag by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The UUID of the blog tag to delete', type: 'string' })
  @ApiResponse({ status: 200, description: 'Tag successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Tag not found.' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.blogTagsService.remove(id);
  }
}