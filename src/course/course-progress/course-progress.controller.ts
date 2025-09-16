import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { CourseProgressService } from './course-progress.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { CourseProgress } from './entities/course-progress.entity';
import { SubmitCourseItemDto } from './dto/submit-course-item.dto';

@ApiTags('Course Progress')
@Controller('courses/:courseId/items')
@UseGuards(AuthGuard('jwt'), RolesGuard)
//@Roles(UserRole.STUDENT)
export class CourseProgressController {
  constructor(private readonly courseProgressService: CourseProgressService) { }

  @Post(':itemId/progress')
  @ApiOperation({
    summary: 'Submit progress for a course item (lecture, quiz, assignment)',
  })
  @ApiResponse({
    status: 201,
    description: 'Progress recorded successfully',
    type: CourseProgress,
  })
  async submitItemProgress(
    @Param('courseId') courseId: string,
    @Param('itemId') itemId: string,
    @Req() req,
    @Body() dto: SubmitCourseItemDto,
  ): Promise<CourseProgress> {
    const studentId = req.user.sub;
    return this.courseProgressService.submitItemProgress(
      courseId,
      itemId,
      studentId,
      dto,
    );
  }

  @Get('/progress')
  @ApiOperation({ summary: 'Get overall progress for a student in a course' })
  @ApiResponse({
    status: 200,
    description: 'Returns progress summary and per-item details',
  })
  async getCourseProgress(@Param('courseId') courseId: string, @Req() req) {
    const studentId = req.user.sub;
    return this.courseProgressService.getCourseProgress(courseId, studentId);
  }
}
