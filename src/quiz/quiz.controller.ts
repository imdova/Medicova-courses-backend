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

@ApiTags('Quizzes')
@Controller('quizzes')
@UseGuards(RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quiz' })
  @ApiResponse({ status: 201, description: 'Quiz successfully created' })
  create(@Body() dto: CreateQuizDto, @Req() req) {
    return this.quizService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List all quizzes' })
  @ApiResponse({ status: 200, description: 'List of quizzes' })
  findAll(@Req() req) {
    return this.quizService.findAll(req.user.sub);
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
