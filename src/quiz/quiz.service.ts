import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './entities/quiz.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QueryConfig } from '../common/utils/query-options';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';

export const QUIZ_PAGINATION_CONFIG: QueryConfig<Quiz> = {
  sortableColumns: ['created_at', 'title'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    title: [FilterOperator.ILIKE], // case-insensitive search by title
    created_by: [FilterOperator.EQ], // filter by owner
  },
  relations: [], // add relations if you want eager joins
};

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

  async findAll(
    query: PaginateQuery,
    userId: string,
  ): Promise<Paginated<Quiz>> {
    const qb = this.quizRepo
      .createQueryBuilder('quiz')
      .loadRelationCountAndMap('quiz.questionCount', 'quiz.quizQuestions')
      .where('quiz.deleted_at IS NULL')
      .andWhere('quiz.created_by = :userId', { userId });

    return paginate(query, qb, QUIZ_PAGINATION_CONFIG);
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
