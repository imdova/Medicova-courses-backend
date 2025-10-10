import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CourseNotesService } from './course-notes.service';
import { CreateCourseNoteDto } from './dto/create-course-note.dto';
import { UpdateCourseNoteDto } from './dto/update-course-note.dto';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Course Notes')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('courses/:courseId/notes')
export class CourseNotesController {
  constructor(private readonly courseNoteService: CourseNotesService) { }

  // 🔹 CREATE NOTE
  @Post()
  @RequirePermissions('note:create')
  @ApiOperation({
    summary: 'Create a new course note',
    description: 'Allows a student to create a note for a specific course.',
  })
  @ApiParam({
    name: 'courseId',
    description: 'UUID of the course the note belongs to',
    type: String,
  })
  @ApiBody({ type: CreateCourseNoteDto })
  @ApiResponse({ status: 201, description: 'Note created successfully' })
  create(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Req() req,
    @Body() dto: CreateCourseNoteDto,
  ) {
    return this.courseNoteService.create(courseId, req.user.sub, dto);
  }

  // 🔹 GET ALL NOTES FOR CURRENT STUDENT
  @Get()
  @RequirePermissions('note:list')
  @ApiOperation({
    summary: 'Get all notes for the current student in a course',
    description: 'Fetches all notes the logged-in student created for this course.',
  })
  @ApiParam({ name: 'courseId', description: 'UUID of the course', type: String })
  @ApiResponse({
    status: 200,
    description: 'List of course notes',
    type: [CreateCourseNoteDto],
  })
  findAll(@Param('courseId', ParseUUIDPipe) courseId: string, @Req() req) {
    return this.courseNoteService.findAll(courseId, req.user.sub);
  }

  // 🔹 GET ONE NOTE
  @Get(':id')
  @RequirePermissions('note:get_by_id')
  @ApiOperation({ summary: 'Get a specific course note' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course', type: String })
  @ApiParam({ name: 'id', description: 'UUID of the note', type: String })
  @ApiResponse({ status: 200, description: 'Note retrieved successfully' })
  findOne(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    return this.courseNoteService.findOne(courseId, id, req.user.sub);
  }

  // 🔹 UPDATE NOTE
  @Patch(':id')
  @RequirePermissions('note:update')
  @ApiOperation({ summary: 'Update a note' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course', type: String })
  @ApiParam({ name: 'id', description: 'UUID of the note', type: String })
  @ApiResponse({ status: 200, description: 'Note updated successfully' })
  update(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
    @Body() dto: UpdateCourseNoteDto,
  ) {
    return this.courseNoteService.update(courseId, id, req.user.sub, dto);
  }

  // 🔹 DELETE NOTE
  @Delete(':id')
  @RequirePermissions('note:delete')
  @ApiOperation({ summary: 'Delete a course note' })
  @ApiParam({ name: 'courseId', description: 'UUID of the course', type: String })
  @ApiParam({ name: 'id', description: 'UUID of the note', type: String })
  @ApiResponse({ status: 200, description: 'Note deleted successfully' })
  remove(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    return this.courseNoteService.remove(courseId, id, req.user.sub);
  }
}
