import {
  Controller,
  Post,
  Param,
  Body,
  Get,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { QuizQuestionsService } from './quiz-questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Quiz Questions')
@Controller('quizzes/:quizId/questions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACADEMY_ADMIN, UserRole.ACADEMY_USER)
export class QuizQuestionsController {
  constructor(private readonly quizQuestionsService: QuizQuestionsService) { }

  @Post()
  @ApiOperation({ summary: 'Create a question and attach it to a quiz' })
  @ApiBody({ description: 'Question Details', type: CreateQuestionDto })
  @ApiParam({ name: 'quizId', type: 'string', description: 'UUID of the quiz' })
  addQuestion(@Param('quizId') quizId: string, @Body() dto: CreateQuestionDto) {
    return this.quizQuestionsService.createQuestionAndAddToQuiz(quizId, dto);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Create multiple questions and attach them to a quiz',
  })
  @ApiBody({
    description: 'Array of questions to create',
    type: CreateQuestionDto,
    isArray: true,
  })
  @ApiParam({ name: 'quizId', type: 'string', description: 'UUID of the quiz' })
  addQuestionsBulk(
    @Param('quizId') quizId: string,
    @Body() dtos: CreateQuestionDto[],
  ) {
    return this.quizQuestionsService.createQuestionsBulk(quizId, dtos);
  }

  @Get()
  @ApiOperation({ summary: 'List all questions for a quiz' })
  @ApiParam({ name: 'quizId', type: 'string' })
  listQuestions(@Param('quizId') quizId: string) {
    return this.quizQuestionsService.listQuestionsForQuiz(quizId);
  }

  @Patch(':quizQuestionId')
  @ApiOperation({ summary: 'Update a question inside a quiz' })
  @ApiParam({ name: 'quizId', type: 'string', description: 'UUID of the quiz' })
  @ApiParam({
    name: 'quizQuestionId',
    type: 'string',
    description: 'UUID of the quiz-question link',
  })
  updateQuestionInQuiz(
    @Param('quizId') quizId: string,
    @Param('quizQuestionId') quizQuestionId: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.quizQuestionsService.updateQuestionInQuiz(
      quizId,
      quizQuestionId,
      dto,
    );
  }

  @Delete(':quizQuestionId')
  @ApiOperation({ summary: 'Remove a question from a quiz' })
  @ApiParam({ name: 'quizId', type: 'string' })
  @ApiParam({ name: 'quizQuestionId', type: 'string' })
  removeQuestion(
    @Param('quizId') quizId: string,
    @Param('quizQuestionId') quizQuestionId: string,
  ) {
    return this.quizQuestionsService.removeQuestionFromQuiz(
      quizId,
      quizQuestionId,
    );
  }
}
