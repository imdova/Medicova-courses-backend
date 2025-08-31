import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttemptMode, Quiz } from './entities/quiz.entity';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { QueryConfig } from '../common/utils/query-options';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { Question } from './entities/question.entity';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizAttempt } from './entities/quiz-attempts.entity';
import { UserRole } from 'src/user/entities/user.entity';
import { CreateQuizWithQuestionsDto } from './dto/create-quiz-with-questions.dto';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizWithStats } from './interface/quiz-with-stats.interface';

export const QUIZ_PAGINATION_CONFIG: QueryConfig<Quiz> = {
  sortableColumns: ['created_at', 'title'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    title: [FilterOperator.ILIKE], // case-insensitive search by title
    status: [FilterOperator.EQ],
    retakes: [FilterOperator.GTE, FilterOperator.LTE],
  },
  relations: [], // add relations if you want eager joins
};

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private attemptRepo: Repository<QuizAttempt>,
  ) {}

  // All methods are checked for performance

  async create(
    dto: CreateQuizDto,
    userId: string,
    academyId?: string,
  ): Promise<Quiz> {
    const quiz = this.quizRepo.create({
      ...dto,
      created_by: userId,
      academy: { id: academyId },
    });
    return this.quizRepo.save(quiz);
  }

  async findAll(
    query: PaginateQuery,
    userId: string,
    role: string,
    academyId: string,
  ): Promise<Paginated<QuizWithStats>> {
    const qb = this.quizRepo
      .createQueryBuilder('quiz')
      .loadRelationCountAndMap('quiz.questionCount', 'quiz.quizQuestions')
      .where('quiz.deleted_at IS NULL');

    // Role restrictions
    if (role === UserRole.ADMIN) {
      // all quizzes
    } else if (role === UserRole.ACADEMY_ADMIN) {
      qb.andWhere('quiz.academy_id = :academyId', { academyId });
    } else {
      qb.andWhere('quiz.created_by = :userId', { userId });
    }

    // Stats (subqueries)
    qb.addSelect(
      (sub) =>
        sub
          .select('AVG(attempt.score)')
          .from(QuizAttempt, 'attempt')
          .where('attempt.quiz_id = quiz.id'),
      'average_score',
    );

    qb.addSelect(
      (sub) =>
        sub
          .select(
            `CASE WHEN COUNT(*) = 0 
           THEN 0 
           ELSE (SUM(CASE WHEN attempt.passed = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) 
          END`,
          )
          .from(QuizAttempt, 'attempt')
          .where('attempt.quiz_id = quiz.id'),
      'success_rate',
    );

    // Run query with paginate
    const paginated = await paginate(query, qb, QUIZ_PAGINATION_CONFIG);

    // Extract raw stats
    const { raw } = await qb.getRawAndEntities();

    // Merge stats into results
    let data: QuizWithStats[] = paginated.data.map((quiz, i) => ({
      ...quiz,
      questionCount: (quiz as any).questionCount ?? 0,
      average_score: raw[i]?.average_score ? Number(raw[i].average_score) : 0,
      success_rate: raw[i]?.success_rate ? Number(raw[i].success_rate) : 0,
    }));

    // Apply manual filters for computed fields (range support)
    const { filter } = query;

    // Question Count
    if (filter?.minQuestionCount) {
      data = data.filter(
        (q) => q.questionCount >= Number(filter.minQuestionCount),
      );
    }
    if (filter?.maxQuestionCount) {
      data = data.filter(
        (q) => q.questionCount <= Number(filter.maxQuestionCount),
      );
    }

    // Average Score
    if (filter?.minAverageScore) {
      data = data.filter(
        (q) => q.average_score >= Number(filter.minAverageScore),
      );
    }
    if (filter?.maxAverageScore) {
      data = data.filter(
        (q) => q.average_score <= Number(filter.maxAverageScore),
      );
    }

    // Success Rate
    if (filter?.minSuccessRate) {
      data = data.filter(
        (q) => q.success_rate >= Number(filter.minSuccessRate),
      );
    }
    if (filter?.maxSuccessRate) {
      data = data.filter(
        (q) => q.success_rate <= Number(filter.maxSuccessRate),
      );
    }

    // Adjust pagination metadata
    return {
      ...paginated,
      data,
      meta: {
        ...paginated.meta,
        totalItems: data.length,
        totalPages: Math.ceil(data.length / paginated.meta.itemsPerPage),
      },
    };
  }

  async findOne(
    id: string,
    userId: string,
    role: string,
    academyId: string,
  ): Promise<Quiz> {
    const quiz = await this.quizRepo.findOne({
      where: { id, deleted_at: null },
      relations: ['quizQuestions', 'quizQuestions.question'],
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    this.checkOwnership(quiz, userId, academyId, role);

    // Map questions
    let questions = quiz.quizQuestions.map((qq) => qq.question);

    // Randomize questions
    if (quiz.randomize_questions) {
      questions = this.shuffleArray(questions);
    }

    // Randomize answers (answers are JSON, so we can shuffle directly)
    if (quiz.randomize_answers) {
      questions = questions.map((q) => ({
        ...q,
        answers: q.answers ? this.shuffleArray([...q.answers]) : [],
      }));
    }

    // Attach shuffled questions back to quizQuestions array
    quiz.quizQuestions = questions.map((q) => ({ question: q } as any));

    return quiz;
  }

  async update(
    id: string,
    dto: UpdateQuizDto,
    userId: string,
    role: string,
    academyId: string,
  ): Promise<Quiz> {
    const quiz = await this.findOne(id, userId, role, academyId);
    Object.assign(quiz, dto);
    return this.quizRepo.save(quiz);
  }

  async remove(id: string): Promise<void> {
    await this.quizRepo.manager.transaction(async (manager) => {
      const quiz = await manager.findOne(Quiz, {
        where: { id },
        relations: ['quizQuestions', 'quizQuestions.question'],
      });

      if (!quiz) throw new NotFoundException('Quiz not found');

      // Remove all questions associated with this quiz
      const questions = quiz.quizQuestions.map((qq) => qq.question);
      if (questions.length) {
        await manager.remove(Question, questions);
      }

      // Remove the quiz (quizQuestions will be removed via cascade)
      await manager.remove(Quiz, quiz);
    });
  }

  async submitStandaloneQuizAttempt(
    quizId: string,
    userId: string,
    dto: SubmitQuizDto,
  ): Promise<QuizAttempt> {
    // Fetch quiz
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId, standalone: true },
      relations: ['quizQuestions', 'quizQuestions.question'],
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Count attempts (faster than fetching all)
    const attemptCount = await this.attemptRepo.count({
      where: { quiz: { id: quizId }, user: { id: userId } },
    });

    // Enforce attempt limits
    if (quiz.attempt_mode === AttemptMode.SINGLE && attemptCount >= 1) {
      throw new BadRequestException('You are only allowed a single attempt.');
    }
    if (quiz.attempt_mode === AttemptMode.MULTIPLE) {
      if (quiz.retakes > 0 && attemptCount >= quiz.retakes) {
        throw new BadRequestException(
          `You have reached the maximum of ${quiz.retakes} attempts.`,
        );
      }
    }

    // Calculate score using frontend correctness
    let score = 0;
    let totalPoints = 0;

    for (const qq of quiz.quizQuestions) {
      totalPoints += qq.question.points;

      const answer = dto.answers.find(
        (a) => a.questionId.toString() === qq.question.id.toString(),
      );

      if (answer && answer.correct) {
        score += qq.question.points;
      }
    }

    const percentageScore = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

    const passed = quiz.passing_score
      ? percentageScore >= quiz.passing_score
      : true;

    // Save QuizAttempt
    const attempt = this.attemptRepo.create({
      quiz,
      user: { id: userId } as any,
      answers: dto.answers,
      score: percentageScore,
      passed,
    });

    await this.attemptRepo.save(attempt);

    return attempt;
  }

  async getStudentQuizAttempts(quizId: string, studentId: string) {
    return this.attemptRepo
      .createQueryBuilder('attempt')
      .leftJoinAndSelect('attempt.quiz', 'quiz')
      .leftJoinAndSelect('attempt.user', 'user')
      .leftJoinAndSelect('attempt.courseStudent', 'courseStudent')
      .leftJoinAndSelect('courseStudent.student', 'student')
      .where('quiz.id = :quizId', { quizId })
      .andWhere('(student.id = :studentId OR user.id = :studentId)', {
        studentId,
      })
      .orderBy('attempt.created_at', 'DESC')
      .getMany();
  }

  private shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async createQuizWithQuestions(
    dto: CreateQuizWithQuestionsDto,
    userId: string,
    academyId?: string,
  ): Promise<Quiz> {
    return this.quizRepo.manager.transaction(async (manager) => {
      // 1. Create quiz
      const quiz = manager.create(Quiz, {
        ...dto.quiz,
        created_by: userId,
        academy: { id: academyId },
      });
      await manager.save(quiz);

      // 2. Create all questions in one go
      const questions = dto.questions.map((q) => manager.create(Question, q));
      await manager.save(questions);

      // 3. Create all quizQuestions in one go
      const quizQuestions = questions.map((question, i) =>
        manager.create(QuizQuestion, {
          quiz,
          question,
          order: dto.questions[i].order ?? i + 1,
        }),
      );
      await manager.save(quizQuestions);

      // 4. Optionally reload with relations (1 extra query)
      return manager.findOne(Quiz, {
        where: { id: quiz.id },
        relations: ['quizQuestions', 'quizQuestions.question'],
      });
    });
  }

  private checkOwnership(
    quiz: Quiz,
    userId: string,
    academyId: string,
    role: string,
  ) {
    if (role === UserRole.ADMIN) return; // full access
    if (role === UserRole.ACADEMY_ADMIN) {
      if (quiz.academy?.id !== academyId) {
        throw new ForbiddenException(
          'You cannot access courses outside your academy',
        );
      }
    } else {
      // instructor / academy_user
      if (quiz.created_by !== userId) {
        throw new ForbiddenException(
          'You are not allowed to access this course',
        );
      }
    }
  }
}
