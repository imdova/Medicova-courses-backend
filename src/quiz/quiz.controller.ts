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
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';
import { QuizAttempt } from './entities/quiz-attempts.entity';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { CreateQuizWithQuestionsDto } from './dto/create-quiz-with-questions.dto';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) { }

  @Post()
  @RequirePermissions('quiz:create')
  @ApiOperation({ summary: 'Create a new quiz' })
  @ApiResponse({ status: 201, description: 'Quiz successfully created' })
  create(@Body() dto: CreateQuizDto, @Req() req) {
    return this.quizService.create(dto, req.user.sub, req.user.academyId);
  }

  @Post('with-questions')
  @RequirePermissions('quiz:create_with_questions')
  @ApiOperation({ summary: 'Create a new quiz with questions' })
  @ApiResponse({
    status: 201,
    description: 'Quiz with questions created successfully',
  })
  createWithQuestions(@Body() dto: CreateQuizWithQuestionsDto, @Req() req) {
    return this.quizService.createQuizWithQuestions(
      dto,
      req.user.sub,
      req.user.academyId,
    );
  }

  @RequirePermissions('quiz:submit')
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

  @RequirePermissions('quiz:attempts')
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
  @RequirePermissions('quiz:list')
  @ApiQuery({
    name: 'filter.title',
    required: false,
    description:
      'Search quizzes by title (ILIKE). Example value: `$ilike:quiz`',
    example: '$ilike:quiz',
  })
  @ApiQuery({
    name: 'filter.status',
    required: false,
    description: 'Filter by quiz status (EQ). Example value: `$eq:published`',
    example: '$eq:published',
  })
  @ApiQuery({
    name: 'filter.retakes',
    required: false,
    description:
      'Filter by number of allowed retakes (GTE/LTE). Example values: `$gte:2`, `$lte:5`',
    example: '$gte:2',
  })

  // Computed columns (manual range filters)
  @ApiQuery({
    name: 'filter.minQuestionCount',
    required: false,
    description:
      'Filter by minimum number of questions (>=). Example: `?filter.minQuestionCount=5`',
    example: 5,
  })
  @ApiQuery({
    name: 'filter.maxQuestionCount',
    required: false,
    description:
      'Filter by maximum number of questions (<=). Example: `?filter.maxQuestionCount=10`',
    example: 10,
  })
  @ApiQuery({
    name: 'filter.minAverageScore',
    required: false,
    description:
      'Filter by minimum average score (>=). Example: `?filter.minAverageScore=40`',
    example: 40,
  })
  @ApiQuery({
    name: 'filter.maxAverageScore',
    required: false,
    description:
      'Filter by maximum average score (<=). Example: `?filter.maxAverageScore=80`',
    example: 80,
  })
  @ApiQuery({
    name: 'filter.minSuccessRate',
    required: false,
    description:
      'Filter by minimum success rate percentage (>=). Example: `?filter.minSuccessRate=20`',
    example: 20,
  })
  @ApiQuery({
    name: 'filter.maxSuccessRate',
    required: false,
    description:
      'Filter by maximum success rate percentage (<=). Example: `?filter.maxSuccessRate=60`',
    example: 60,
  })
  @ApiOperation({ summary: 'List all quizzes' })
  @ApiResponse({ status: 200, description: 'List of quizzes' })
  findAll(
    @Paginate() query: PaginateQuery,
    @Req() req,
  ): Promise<Paginated<any>> {
    return this.quizService.findAll(
      query,
      req.user.sub,
      req.user.role,
      req.user.academyId,
    );
  }

  @Get(':id')
  @RequirePermissions('quiz:get')
  @ApiOperation({ summary: 'Get quiz by ID (instructor or student)' })
  @ApiResponse({ status: 200, description: 'Quiz found' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.quizService.findOne(
      id,
      req.user.sub,
      req.user.role,
      req.user.academyId,
    );
  }

  @Patch(':id')
  @RequirePermissions('quiz:update')
  @ApiOperation({ summary: 'Update quiz by ID' })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  update(@Param('id') id: string, @Body() dto: UpdateQuizDto, @Req() req) {
    return this.quizService.update(
      id,
      dto,
      req.user.sub,
      req.user.role,
      req.user.academyId,
    );
  }

  @Delete(':id')
  @RequirePermissions('quiz:delete')
  @ApiOperation({ summary: 'Delete quiz by ID (soft delete)' })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  remove(@Param('id') id: string) {
    return this.quizService.remove(id);
  }
}
