import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CourseCommunityService } from './course-community.service';
import { CreateCourseCommunityDto } from './dto/create-course-community.dto';
import { UpdateCourseCommunityDto } from './dto/update-course-community.dto';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Course Community')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('courses/:courseId/community')
export class CourseCommunityController {
  constructor(
    private readonly courseCommunityService: CourseCommunityService,
  ) { }

  // 🔹 CREATE COMMENT / POST
  @Post()
  @RequirePermissions('community:create')
  @ApiOperation({
    summary: 'Create a new community post or comment',
    description:
      'Allows an enrolled student, instructor, or admin to create a new post or reply within a specific course community.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'UUID of the course this comment belongs to',
    type: String,
  })
  @ApiBody({ type: CreateCourseCommunityDto })
  @ApiResponse({ status: 201, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Not enrolled in this course (for students)',
  })
  create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Req() req,
    @Body() dto: CreateCourseCommunityDto,
  ) {
    return this.courseCommunityService.create(courseId, req.user.sub, dto);
  }

  // 🔹 INCREASE LIKE COUNT
  @Post(':id/like')
  @RequirePermissions('community:like')
  @ApiOperation({
    summary: 'Like a community comment',
    description: 'Increments the like counter of a community comment or reply.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'UUID of the course this comment belongs to',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the comment/post to like',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Like count increased successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  likeComment(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.courseCommunityService.likeComment(courseId, id);
  }

  // 🔹 GET ALL COMMENTS FOR A COURSE
  @Get()
  @RequirePermissions('community:list')
  @ApiOperation({
    summary: 'Get all community posts and replies for a course',
    description:
      'Fetches all comments (and optionally replies) for a specific course community, sorted by creation date.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'UUID of the course',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of course community posts and comments',
    type: [CreateCourseCommunityDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Param('courseId', ParseUUIDPipe) courseId: string) {
    return this.courseCommunityService.findAll(courseId);
  }

  // 🔹 GET SINGLE COMMENT / POST
  @Get(':id')
  @RequirePermissions('community:get_by_id')
  @ApiOperation({
    summary: 'Get a specific community post or comment',
    description: 'Fetch a single community post by its UUID.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'UUID of the course this comment belongs to',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the community comment/post',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Comment retrieved successfully',
    type: CreateCourseCommunityDto,
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  findOne(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.courseCommunityService.findOne(courseId, id);
  }

  // 🔹 UPDATE COMMENT
  @Patch(':id')
  @RequirePermissions('community:update')
  @ApiOperation({
    summary: 'Update a community post or comment',
    description:
      'Allows the author of a comment or an admin to edit an existing post.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'UUID of the course this comment belongs to',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the comment/post to update',
    type: String,
  })
  @ApiBody({ type: CreateCourseCommunityDto })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Not authorized to update this comment' })
  update(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
    @Body() dto: UpdateCourseCommunityDto,
  ) {
    return this.courseCommunityService.update(courseId, id, req.user.sub, dto);
  }

  // 🔹 DELETE COMMENT
  @Delete(':id')
  @RequirePermissions('community:delete')
  @ApiOperation({
    summary: 'Delete a community post or comment',
    description:
      'Allows the author or an admin/instructor to delete a community post or comment.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'UUID of the course this comment belongs to',
    type: String,
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the comment/post to delete',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this comment' })
  remove(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    return this.courseCommunityService.remove(courseId, id, req.user.sub);
  }
}
