import {
  Controller,
  Param,
  Body,
  UseGuards,
  Req,
  Get,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { AssignmentService } from './assignment.service';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Course Assignments')
@Controller('courses/:courseId/assignments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CourseAssignmentController {
  constructor(private readonly assignmentService: AssignmentService) { }

  @Get()
  @RequirePermissions('assignment:list_with_students')
  @ApiOperation({
    summary: 'Get all assignments for a course with student info (instructor)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of assignments with submissions',
  })
  async getAllAssignmentsForCourse(@Param('courseId') courseId: string) {
    return this.assignmentService.getAllAssignmentsWithSubmissions(courseId);
  }

  @RequirePermissions('assignment:update_score')
  @Patch(':assignmentId/submissions/:submissionId/score')
  @ApiOperation({
    summary: 'Update score for an assignment submission (instructor)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        score: { type: 'number', example: 85 },
      },
      required: ['score'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment submission score updated successfully',
    type: AssignmentSubmission,
  })
  async updateScore(
    @Param('courseId') courseId: string,
    @Param('assignmentId') assignmentId: string,
    @Param('submissionId') submissionId: string,
    @Body('score') score: number,
    @Req() req,
  ): Promise<AssignmentSubmission> {
    const teacherId = req.user.sub;
    return this.assignmentService.updateSubmissionScore(
      assignmentId,
      submissionId,
      teacherId,
      score,
    );
  }
}
