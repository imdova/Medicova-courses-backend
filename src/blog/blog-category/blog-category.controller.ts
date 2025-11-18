import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BlogCategoryService } from './blog-category.service';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiBearerAuth('access_token')
@ApiTags('Blog Categories')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('blog-categories')
export class BlogCategoryController {
  constructor(private readonly blogCategoryService: BlogCategoryService) { }

  @Post()
  //@RequirePermissions('blog_category:create')
  @ApiOperation({ summary: 'Create a new blog category' })
  @ApiResponse({
    status: 201,
    description: 'The blog category has been successfully created.'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.'
  })
  @ApiResponse({
    status: 409,
    description: 'Category with this name or slug already exists.'
  })
  create(@Body() createBlogCategoryDto: CreateBlogCategoryDto) {
    return this.blogCategoryService.create(createBlogCategoryDto);
  }

  @Get()
  //@RequirePermissions('blog_category:list')
  @ApiOperation({ summary: 'Get all blog categories' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status'
  })
  @ApiQuery({
    name: 'includeBlogs',
    required: false,
    type: Boolean,
    description: 'Include blog count for each category'
  })
  @ApiQuery({
    name: 'parentId',
    required: false,
    type: String,
    description: 'Filter by parent category ID'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all blog categories.'
  })
  findAll(
    @Query('isActive') isActive?: boolean,
    @Query('includeBlogs') includeBlogs?: boolean,
    @Query('parentId') parentId?: string,
  ) {
    return this.blogCategoryService.findAll({
      isActive,
      includeBlogs: includeBlogs === true,
      parentId
    });
  }

  @Get('hierarchy')
  //@RequirePermissions('blog_category:hierarchy')
  @ApiOperation({ summary: 'Get blog categories with hierarchical structure' })
  @ApiResponse({
    status: 200,
    description: 'Returns blog categories in hierarchical format.'
  })
  getHierarchy() {
    return this.blogCategoryService.getCategoryHierarchy();
  }

  @Get('slug/:slug')
  //@RequirePermissions('blog-category:get_by_slug')
  @ApiOperation({ summary: 'Get blog category by slug' })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Blog category slug'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the blog category.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog category not found.'
  })
  findBySlug(@Param('slug') slug: string) {
    return this.blogCategoryService.findBySlug(slug);
  }

  @Get(':id')
  //@RequirePermissions('blog_category:get_by_id')
  @ApiOperation({ summary: 'Get blog category by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog category UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the blog category.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog category not found.'
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogCategoryService.findOne(id);
  }

  @Get(':id/blogs')
  //@RequirePermissions('blog_category:get_blogs_for_category')
  @ApiOperation({ summary: 'Get all blogs for a specific category' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog category UUID'
  })
  @ApiQuery({
    name: 'includeSubcategories',
    required: false,
    type: Boolean,
    description: 'Include blogs from subcategories'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns blogs for the category.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog category not found.'
  })
  getCategoryBlogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('includeSubcategories') includeSubcategories?: boolean,
  ) {
    return this.blogCategoryService.getCategoryBlogs(id, includeSubcategories === true);
  }

  @Patch(':id')
  //@RequirePermissions('blog_category:update')
  @ApiOperation({ summary: 'Update a blog category' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog category UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'The blog category has been successfully updated.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog category not found.'
  })
  @ApiResponse({
    status: 409,
    description: 'Category with this name or slug already exists.'
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateBlogCategoryDto: Partial<CreateBlogCategoryDto>
  ) {
    return this.blogCategoryService.update(id, updateBlogCategoryDto);
  }

  @Delete(':id')
  //@RequirePermissions('blog_category:delete')
  @ApiOperation({ summary: 'Delete a blog category' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog category UUID'
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: 204,
    description: 'The blog category has been successfully deleted.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog category not found.'
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete category with existing blogs or subcategories.'
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogCategoryService.remove(id);
  }

  @Get(':id/subcategories')
  //@RequirePermissions('blog_category:get_subcategories_for_category')
  @ApiOperation({ summary: 'Get subcategories of a blog category' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog category UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns subcategories of the category.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog category not found.'
  })
  getSubcategories(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogCategoryService.getSubcategories(id);
  }
}