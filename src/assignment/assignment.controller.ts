import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Assignment } from './entities/assignment.entity';

@ApiTags('Assignments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) { }

  @Post()
  @RequirePermissions('assignment:create')
  @ApiOperation({
    summary: 'Create a new assignment (instructors, academy content creator & admins)',
  })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assignment created',
  })
  create(@Body() dto: CreateAssignmentDto, @Req() req) {
    return this.assignmentService.create(dto, req.user.sub, req.user.academyId);
  }

  @Post(':id/remind')
  @RequirePermissions('assignment:send_reminder')
  @ApiOperation({
    summary: 'Send reminder email to all students about this assignment',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Optional custom message to include in the email' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reminder emails sent' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Assignment not found' })
  async sendReminder(
    @Param('id') id: string,
    @Req() req,
    @Body('message') message?: string,
  ) {
    return this.assignmentService.sendReminderToStudents(
      id,
      req.user.sub,
      req.user.role,
      req.user.academyId,
      message,
    );
  }

  @Get()
  @RequirePermissions('assignment:list')
  @ApiOperation({
    summary:
      'List assignments (instructors: their own; academy content creators: their academy; admins: all)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of assignments' })
  findAll(@Req() req, @Paginate() query: PaginateQuery): Promise<Paginated<Assignment>> {
    return this.assignmentService.findAllForUser(query,
      req.user.sub,       // requesterId
      req.user.role,      // role
      req.user.academyId, // academyId
    );
  }

  @Get(':id')
  @RequirePermissions('assignment:get')
  @ApiOperation({
    summary:
      'Get assignment by ID (instructors: only their own; academy content creators: same academy; admins: any)',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not found' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.assignmentService.findOneForUser(
      id,
      req.user.sub,
      req.user.role,
      req.user.academyId
    );
  }

  @Get(':assignmentId/overview')
  //@RequirePermissions('assignment:overview')
  @ApiOperation({ summary: 'Get overview statistics for an assignment' })
  async getAssignmentOverview(@Param('assignmentId') assignmentId: string) {
    return this.assignmentService.getAssignmentOverview(assignmentId);
  }

  @Get(':assignmentId/stats/students')
  //@RequirePermissions('assignment:stats:students')
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: 'Number of results per page',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['submitted', 'graded'],
    description: 'Filter submissions by status',
  })
  @ApiQuery({
    name: 'minScore',
    required: false,
    type: Number,
    example: 50,
    description: 'Minimum score filter',
  })
  @ApiQuery({
    name: 'maxScore',
    required: false,
    type: Number,
    example: 100,
    description: 'Maximum score filter',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    example: '2025-01-01',
    description: 'Filter submissions after this date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    example: '2025-01-31',
    description: 'Filter submissions before this date (YYYY-MM-DD)',
  })
  async getAssignmentStatsByStudent(
    @Param('assignmentId') assignmentId: string,
    @Query() query: any,
  ) {
    return this.assignmentService.getStudentStatsForAssignment(assignmentId, {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
      status: query.status,
      minScore: query.minScore ? Number(query.minScore) : undefined,
      maxScore: query.maxScore ? Number(query.maxScore) : undefined,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  @Patch(':id')
  @RequirePermissions('assignment:update')
  @ApiOperation({
    summary:
      'Update assignment (instructors: only their own; academy content creators: same academy; admins: any',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiBody({ type: UpdateAssignmentDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not allowed' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @Req() req,
  ) {
    return this.assignmentService.updateForUser(
      id,
      dto,
      req.user.sub,
      req.user.role,
      req.user.academyId
    );
  }

  @Delete(':id')
  @RequirePermissions('assignment:delete')
  @ApiOperation({
    summary:
      'Delete assignment (instructors: only their own; academy content creators: same academy; admins: any',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment deleted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not allowed' })
  remove(@Param('id') id: string, @Req() req) {
    return this.assignmentService.removeForUser(
      id,
      req.user.sub,
      req.user.role,
      req.user.academyId
    );
  }
}
