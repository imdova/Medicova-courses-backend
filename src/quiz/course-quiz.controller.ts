import { Controller, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizService } from './quiz.service';
import { QuizAttempt } from './entities/quiz-attempts.entity';

@ApiTags('Course Quizzes')
@Controller('courses/:courseId/quizzes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.STUDENT)
export class CourseQuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post(':quizId/attempts')
  @ApiOperation({ summary: 'Submit a quiz attempt for a course' })
  @ApiResponse({
    status: 201,
    description: 'Quiz attempt recorded successfully',
    type: QuizAttempt,
  })
  async submitQuiz(
    @Param('courseId') courseId: string,
    @Param('quizId') quizId: string,
    @Req() req,
    @Body() submitQuizDto: SubmitQuizDto,
  ): Promise<QuizAttempt> {
    const userId = req.user.sub;

    // delegate to service
    return this.quizService.submitQuizAttempt(
      courseId,
      quizId,
      userId,
      submitQuizDto,
    );
  }
}
