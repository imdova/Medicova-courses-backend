import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { QuizQuestion } from './entities/quiz-question.entity';
import { Question } from './entities/question.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
  ) {}

  async create(dto: CreateQuizDto, userId: string): Promise<Quiz> {
    const quiz = this.quizRepo.create({
      ...dto,
      created_by: userId,
    });
    return this.quizRepo.save(quiz);
  }

  async findAll(userId: string): Promise<Quiz[]> {
    return this.quizRepo.find({
      where: { deleted_at: null, created_by: userId },
    });
  }

  async findOne(id: string): Promise<Quiz> {
    const quiz = await this.quizRepo.findOne({
      where: { id, deleted_at: null },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async update(id: string, dto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOne(id);
    Object.assign(quiz, dto);
    return this.quizRepo.save(quiz);
  }

  async remove(id: string): Promise<void> {
    const quiz = await this.findOne(id);
    quiz.deleted_at = new Date();
    await this.quizRepo.save(quiz);
  }
}
