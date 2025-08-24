import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { Quiz } from './entities/quiz.entity';
import { AuthGuard } from '@nestjs/passport';
import { QuizAttempt } from './entities/quiz-attempts.entity';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quiz' })
  @ApiResponse({ status: 201, description: 'Quiz successfully created' })
  create(@Body() dto: CreateQuizDto, @Req() req) {
    return this.quizService.create(dto, req.user.sub);
  }

  @Roles(UserRole.STUDENT)
  @Post(':quizId/attempts')
  @ApiOperation({ summary: 'Submit a standalone quiz attempt' })
  @ApiResponse({
    status: 201,
    description: 'Quiz attempt recorded successfully',
    type: QuizAttempt,
  })
  async submitStandaloneQuiz(
    @Param('quizId') quizId: string,
    @Req() req,
    @Body() submitQuizDto: SubmitQuizDto,
  ): Promise<QuizAttempt> {
    const userId = req.user.sub;

    return this.quizService.submitStandaloneQuizAttempt(
      quizId,
      userId,
      submitQuizDto,
    );
  }

  @Roles(UserRole.STUDENT)
  @Get(':quizId/score')
  @ApiOperation({
    summary: 'Get all quiz attempts scores for current student',
  })
  @ApiResponse({
    status: 200,
    description: 'List of quiz attempts scores for current student',
    type: [QuizAttempt],
  })
  async getMyQuizAttempts(
    @Param('quizId') quizId: string,
    @Req() req,
  ): Promise<QuizAttempt[]> {
    const studentId = req.user.sub;
    return this.quizService.getStudentQuizAttempts(quizId, studentId);
  }

  @Get()
  @ApiOperation({ summary: 'List all quizzes' })
  @ApiResponse({ status: 200, description: 'List of quizzes' })
  findAll(
    @Paginate() query: PaginateQuery,
    @Req() req,
  ): Promise<Paginated<Quiz>> {
    return this.quizService.findAll(query, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID' })
  @ApiResponse({ status: 200, description: 'Quiz found' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  findOne(@Param('id') id: string) {
    return this.quizService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quiz by ID' })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto) {
    return this.quizService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete quiz by ID (soft delete)' })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  remove(@Param('id') id: string) {
    return this.quizService.remove(id);
  }
}
