import {
  BadRequestException,
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
    @InjectRepository(QuizAttempt)
    private attemptRepo: Repository<QuizAttempt>,
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
      relations: ['quizQuestions', 'quizQuestions.question'],
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

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

  async update(id: string, dto: UpdateQuizDto): Promise<Quiz> {
    const quiz = await this.findOne(id);
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
}
