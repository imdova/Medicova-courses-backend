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
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiBearerAuth('access_token')
@ApiTags('Blog')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) { }

  @Post()
  @RequirePermissions('blog:create')
  @ApiOperation({ summary: 'Create a new blog post' })
  @ApiResponse({
    status: 201,
    description: 'The blog post has been successfully created.'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.'
  })
  create(@Body() createBlogDto: CreateBlogDto) {
    return this.blogService.create(createBlogDto);
  }

  @Get()
  @RequirePermissions('blog:list')
  @ApiOperation({ summary: 'Get all blog posts' })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status'
  })
  @ApiQuery({
    name: 'isDraft',
    required: false,
    type: Boolean,
    description: 'Filter by draft status'
  })
  @ApiQuery({
    name: 'isTemplate',
    required: false,
    type: Boolean,
    description: 'Filter by template status'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all blog posts.'
  })
  findAll(
    @Query('isActive') isActive?: boolean,
    @Query('isDraft') isDraft?: boolean,
    @Query('isTemplate') isTemplate?: boolean,
  ) {
    return this.blogService.findAll({ isActive, isDraft, isTemplate });
  }

  @Get('slug/:slug')
  @RequirePermissions('blog:get_by_slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiParam({
    name: 'slug',
    type: String,
    description: 'Blog post slug'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the blog post.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found.'
  })
  findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Get(':id')
  @RequirePermissions('blog:get_by_id')
  @ApiOperation({ summary: 'Get blog post by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog post UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the blog post.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found.'
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('blog:update')
  @ApiOperation({ summary: 'Update a blog post' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog post UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'The blog post has been successfully updated.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found.'
  })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateBlogDto: UpdateBlogDto) {
    return this.blogService.update(id, updateBlogDto);
  }

  @Delete(':id')
  @RequirePermissions('blog:delete')
  @ApiOperation({ summary: 'Delete a blog post' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog post UUID'
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: 204,
    description: 'The blog post has been successfully deleted.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found.'
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogService.remove(id);
  }

  @Patch(':id/increment-views')
  @RequirePermissions('blog:increment_views')
  @ApiOperation({ summary: 'Increment blog post view count' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Blog post UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'View count incremented.'
  })
  @ApiResponse({
    status: 404,
    description: 'Blog post not found.'
  })
  incrementViews(@Param('id', ParseUUIDPipe) id: string) {
    return this.blogService.incrementViews(id);
  }
}