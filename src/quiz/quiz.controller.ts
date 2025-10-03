import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
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
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { UpdateQuizWithQuestionsDto } from './dto/update-quiz-with-questions.dto';

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

  @Get(':quizId/stats/country')
  @RequirePermissions('quiz:stats:country')
  async getQuizStatsByCountry(@Param('quizId') quizId: string) {
    return this.quizService.getCountryWiseStatsForQuiz(quizId);
  }

  @Get(':quizId/stats/students')
  @RequirePermissions('quiz:stats:students')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Number of results per page' })
  @ApiQuery({ name: 'status', required: false, enum: ['passed', 'failed'], description: 'Filter attempts by status' })
  @ApiQuery({ name: 'minScore', required: false, type: Number, example: 50, description: 'Minimum score filter' })
  @ApiQuery({ name: 'maxScore', required: false, type: Number, example: 100, description: 'Maximum score filter' })
  @ApiQuery({ name: 'startDate', required: false, type: String, example: '2025-01-01', description: 'Filter attempts after this date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, example: '2025-01-31', description: 'Filter attempts before this date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'minTime', required: false, type: Number, example: 30, description: 'Minimum time spent (in seconds/minutes depending on your field)' })
  @ApiQuery({ name: 'maxTime', required: false, type: Number, example: 300, description: 'Maximum time spent (in seconds/minutes depending on your field)' })
  async getQuizStatsByStudent(
    @Param('quizId') quizId: string,
    @Query() query: any,
  ) {
    return this.quizService.getStudentStatsForQuiz(quizId, {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
      status: query.status,
      minScore: query.minScore ? Number(query.minScore) : undefined,
      maxScore: query.maxScore ? Number(query.maxScore) : undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      minTime: query.minTime ? Number(query.minTime) : undefined,
      maxTime: query.maxTime ? Number(query.maxTime) : undefined,
    });
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
  @ApiQuery({
    name: 'filter.userId',
    required: false,
    description: 'Filter quizzes attempted by a specific user or student',
    example: 'user-uuid',
  })
  @ApiQuery({
    name: 'filter.minAnswerTime',
    required: false,
    description: 'Minimum allowed answer time (>=)',
    example: 30,
  })
  @ApiQuery({
    name: 'filter.maxAnswerTime',
    required: false,
    description: 'Maximum allowed answer time (<=)',
    example: 120,
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

  @Get(':quizId/overview')
  @RequirePermissions('quiz:overview')
  @ApiOperation({ summary: 'Get quiz overview' })
  @ApiResponse({ status: 200, description: 'Quiz overview with stats' })
  async getQuizOverview(@Param('quizId') quizId: string) {
    return this.quizService.getQuizOverview(quizId);
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

  @Patch(':id/with-questions')
  @RequirePermissions('quiz:update_with_questions')
  @ApiOperation({ summary: 'Update quiz and its questions' })
  @ApiResponse({ status: 200, description: 'Quiz and questions updated successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async updateWithQuestions(
    @Param('id') id: string,
    @Body() dto: UpdateQuizWithQuestionsDto,
    @Req() req,
  ) {
    return this.quizService.updateQuizWithQuestions(
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
