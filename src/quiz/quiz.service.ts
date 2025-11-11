import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { CreateQuizWithQuestionsDto } from './dto/create-quiz-with-questions.dto';
import { QuizQuestion } from './entities/quiz-question.entity';
import { QuizWithStats } from './interface/quiz-with-stats.interface';
import { UpdateQuizWithQuestionsDto } from './dto/update-quiz-with-questions.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CourseStudent } from 'src/course/entities/course-student.entity';

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
    private readonly dataSource: DataSource
  ) { }

  // All methods are checked for performance

  async create(
    dto: CreateQuizDto,
    userId: string,
    academyId?: string,
  ): Promise<Quiz> {
    const quiz = this.quizRepo.create({
      ...dto,
      createdBy: userId,
      academy: { id: academyId },
    });
    return this.quizRepo.save(quiz);
  }

  async findAll(
    query: PaginateQuery,
    userId: string,
    role: string,
    academyId: string,
  ): Promise<Paginated<QuizWithStats & { users: any[] }>> {
    const QUESTION_COUNT = `(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = quiz.id)`;
    const AVG_SCORE = `(SELECT COALESCE(AVG(qa.score), 0) FROM quiz_attempts qa WHERE qa.quiz_id = quiz.id)`;
    const SUCCESS_RATE = `
    (SELECT COALESCE(
      CASE WHEN COUNT(*) = 0 THEN 0
           ELSE (SUM(CASE WHEN qa.passed = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
      END
    , 0)
     FROM quiz_attempts qa
     WHERE qa.quiz_id = quiz.id)
  `;

    const qb = this.quizRepo
      .createQueryBuilder('quiz')
      .where('quiz.deleted_at IS NULL');

    // Role restrictions
    if (role === 'admin') {
      // all quizzes
    } else if (role === 'academy_admin') {
      qb.andWhere('quiz.academy_id = :academyId', { academyId });
    } else {
      qb.andWhere('quiz.created_by = :userId', { userId });
    }

    // Select aggregates
    qb.addSelect(QUESTION_COUNT, 'questionCount')
      .addSelect(AVG_SCORE, 'average_score')
      .addSelect(SUCCESS_RATE, 'success_rate');

    // Computed filters
    const { filter } = query;
    if (filter?.minQuestionCount !== undefined) {
      qb.andWhere(`${QUESTION_COUNT} >= :minQuestionCount`, {
        minQuestionCount: Number(filter.minQuestionCount),
      });
    }
    if (filter?.maxQuestionCount !== undefined) {
      qb.andWhere(`${QUESTION_COUNT} <= :maxQuestionCount`, {
        maxQuestionCount: Number(filter.maxQuestionCount),
      });
    }
    if (filter?.minAverageScore !== undefined) {
      qb.andWhere(`${AVG_SCORE} >= :minAverageScore`, {
        minAverageScore: Number(filter.minAverageScore),
      });
    }
    if (filter?.maxAverageScore !== undefined) {
      qb.andWhere(`${AVG_SCORE} <= :maxAverageScore`, {
        maxAverageScore: Number(filter.maxAverageScore),
      });
    }
    if (filter?.minSuccessRate !== undefined) {
      qb.andWhere(`${SUCCESS_RATE} >= :minSuccessRate`, {
        minSuccessRate: Number(filter.minSuccessRate),
      });
    }
    if (filter?.maxSuccessRate !== undefined) {
      qb.andWhere(`${SUCCESS_RATE} <= :maxSuccessRate`, {
        maxSuccessRate: Number(filter.maxSuccessRate),
      });
    }
    // Only add filter if a real userId is provided
    if (filter?.userId !== undefined && filter.userId !== null && filter.userId !== '') {
      qb.andWhere(`
    EXISTS (
      SELECT 1 
      FROM quiz_attempts qa 
      LEFT JOIN course_student cs ON qa.course_student_id = cs.id 
      WHERE qa.quiz_id = quiz.id 
      AND (qa.user_id = :filterUserId OR cs.student_id = :filterUserId)
    )
  `, { filterUserId: filter.userId });
    }

    // NEW: Filter by answer_time range
    if (filter?.minAnswerTime !== undefined) {
      qb.andWhere('quiz.answer_time >= :minAnswerTime', {
        minAnswerTime: Number(filter.minAnswerTime),
      });
    }
    if (filter?.maxAnswerTime !== undefined) {
      qb.andWhere('quiz.answer_time <= :maxAnswerTime', {
        maxAnswerTime: Number(filter.maxAnswerTime),
      });
    }

    // Paginate
    const paginated = await paginate<Quiz>(query, qb, QUIZ_PAGINATION_CONFIG);

    const offset =
      (paginated.meta.currentPage - 1) * paginated.meta.itemsPerPage;
    const limit = paginated.meta.itemsPerPage;

    const { entities, raw } = await qb
      .skip(offset)
      .take(limit)
      .getRawAndEntities();

    // Collect quizIds for batch user loading
    const quizIds = entities.map(q => q.id);
    let attempts = [];
    if (quizIds.length > 0) {
      const attemptsQb = this.attemptRepo
        .createQueryBuilder('attempt')
        .leftJoinAndSelect('attempt.quiz', 'quiz')
        .leftJoinAndSelect('attempt.courseStudent', 'courseStudent')
        .leftJoinAndSelect('courseStudent.student', 'student')
        .leftJoinAndSelect('attempt.user', 'user')
        .where('attempt.quiz_id IN (:...quizIds)', { quizIds });

      attempts = await attemptsQb.getMany();
    }

    // Map quizId -> users
    const quizUsersMap = new Map<string, any[]>();
    for (const attempt of attempts) {
      const quizId = attempt.quiz.id;
      const users: any[] = quizUsersMap.get(quizId) ?? [];
      if (attempt.user) {
        users.push(attempt.user);
      } else if (attempt.courseStudent?.student) {
        users.push(attempt.courseStudent.student);
      }
      quizUsersMap.set(quizId, users);
    }

    // Merge aggregates + users
    const data: (QuizWithStats & { users: any[] })[] = entities.map((quiz, i) => ({
      ...quiz,
      questionCount: Number(raw[i]?.questionCount ?? 0),
      average_score: Number(raw[i]?.average_score ?? 0),
      success_rate: Number(raw[i]?.success_rate ?? 0),
      users: quizUsersMap.get(quiz.id) ?? [],
    }));

    return {
      ...paginated,
      data,
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

    // // Enforce attempt limits
    // if (quiz.attempt_mode === AttemptMode.SINGLE && attemptCount >= 1) {
    //   throw new BadRequestException('You are only allowed a single attempt.');
    // }
    // if (quiz.attempt_mode === AttemptMode.MULTIPLE) {
    //   if (quiz.retakes > 0 && attemptCount >= quiz.retakes) {
    //     throw new BadRequestException(
    //       `You have reached the maximum of ${quiz.retakes} attempts.`,
    //     );
    //   }
    // }

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
      timeTaken: dto.timeTaken, // ✅ new field
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
        createdBy: userId,
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

  async updateQuizWithQuestions(
    quizId: string,
    dto: UpdateQuizWithQuestionsDto,
    userId: string,
    role: string,
    academyId: string,
  ): Promise<Quiz> {
    return this.quizRepo.manager.transaction(async (manager) => {
      // 1. Fetch quiz with ownership check
      const quiz = await manager.findOne(Quiz, {
        where: { id: quizId, deleted_at: null },
        relations: ['quizQuestions', 'quizQuestions.question'],
      });
      if (!quiz) throw new NotFoundException('Quiz not found');
      this.checkOwnership(quiz, userId, academyId, role);

      // 2. Update quiz fields if provided
      if (dto.quiz) {
        Object.assign(quiz, dto.quiz);
        await manager.save(quiz);
      }

      // 3. Process questions if provided
      if (dto.questions && dto.questions.length > 0) {
        // Separate operations for better performance
        const toDelete: string[] = [];
        const toUpdate: Array<{ id: string; data: Record<string, any> }> = [];
        const toCreate: Array<Record<string, any>> = [];
        const toReorder: Array<{ id: string; order: number }> = [];

        // Categorize operations
        for (const q of dto.questions) {
          if (q.id && q.delete) {
            // Validate question belongs to this quiz before deletion
            const questionExists = quiz.quizQuestions.some(qq => qq.question.id === q.id);
            if (!questionExists) {
              throw new BadRequestException(`Question ${q.id} does not belong to this quiz`);
            }
            toDelete.push(q.id);
          } else if (q.id) {
            // Validate question exists and belongs to this quiz
            const existingQuizQuestion = quiz.quizQuestions.find(qq => qq.question.id === q.id);
            if (!existingQuizQuestion) {
              throw new NotFoundException(`Question ${q.id} not found in this quiz`);
            }

            // Prepare update data (exclude id, delete, and order from question data)
            const { id, delete: _, order, ...questionData } = q;
            if (Object.keys(questionData).length > 0) {
              toUpdate.push({ id, data: questionData });
            }

            // Handle reordering separately
            if (order !== undefined) {
              toReorder.push({ id, order });
            }
          } else {
            // New question
            const { id, delete: _, ...questionData } = q;
            toCreate.push(questionData);
          }
        }

        // Execute batch operations

        // 4. Delete questions (this will cascade to quiz_questions table)
        if (toDelete.length > 0) {
          await manager.delete(Question, toDelete);
        }

        // 5. Update existing questions in batch
        for (const { id, data } of toUpdate) {
          await manager.update(Question, { id }, data);
        }

        // 6. Create new questions and their quiz_question relationships
        if (toCreate.length > 0) {
          // Ensure required fields are present for new questions
          const validatedQuestions = toCreate.map((q) => {
            if (!q.type || !q.text || q.points === undefined) {
              throw new BadRequestException('New questions must have type, text, and points');
            }

            // Create the question data, excluding order which is handled separately
            const { order, ...questionData } = q;
            return { questionData, order };
          });

          const newQuestions = validatedQuestions.map(({ questionData }) =>
            manager.create(Question, questionData as any)
          );
          await manager.save(newQuestions);

          // Create quiz_question relationships
          const currentMaxOrder = Math.max(
            ...quiz.quizQuestions.map(qq => qq.order || 0),
            0
          );

          const quizQuestions = newQuestions.map((question, index) => {
            const { order } = validatedQuestions[index];
            const finalOrder = order ?? (currentMaxOrder + index + 1);

            return manager.create(QuizQuestion, {
              quiz,
              question,
              order: finalOrder,
            });
          });

          await manager.save(quizQuestions);
        }

        // 7. Handle reordering
        if (toReorder.length > 0) {
          for (const { id, order } of toReorder) {
            await manager.update(
              QuizQuestion,
              { quiz: { id: quizId }, question: { id } },
              { order }
            );
          }
        }
      }

      // 8. Reload quiz with updated relations and return
      const updatedQuiz = await manager.findOne(Quiz, {
        where: { id: quiz.id },
        relations: ['quizQuestions', 'quizQuestions.question'],
      });

      // Sort questions by order for consistent response
      if (updatedQuiz?.quizQuestions) {
        updatedQuiz.quizQuestions.sort((a, b) => (a.order || 0) - (b.order || 0));
      }

      return updatedQuiz;
    });
  }

  private checkOwnership(
    quiz: Quiz,
    userId: string,
    academyId: string,
    role: string,
  ) {
    if (role === 'admin') return; // full access
    if (role === 'academy_admin') {
      if (quiz.academy?.id !== academyId) {
        throw new ForbiddenException(
          'You cannot access quizzes outside your academy',
        );
      }
    } else {
      // instructor / academy_user
      if (quiz.createdBy !== userId) {
        throw new ForbiddenException(
          'You are not allowed to access this quiz',
        );
      }
    }
  }

  async getCountryWiseStatsForQuiz(quizId: string) {
    return this.attemptRepo
      .createQueryBuilder('attempt')
      .leftJoin('attempt.user', 'user') // direct user
      .leftJoin('user.profile', 'userProfile')
      .leftJoin('attempt.courseStudent', 'courseStudent') // via course enrollment
      .leftJoin('courseStudent.student', 'student')
      .leftJoin('student.profile', 'studentProfile')
      .select(
        `COALESCE(userProfile.country ->> 'name', studentProfile.country ->> 'name')`,
        'country',
      )
      .addSelect('AVG(attempt.score)', 'averageScore')
      .addSelect('AVG(attempt.timeTaken)', 'averageTime')
      .where('attempt.quiz_id = :quizId', { quizId })
      .groupBy(
        `COALESCE(userProfile.country ->> 'name', studentProfile.country ->> 'name')`,
      )
      .getRawMany();
  }

  async getStudentStatsForQuiz(
    quizId: string,
    {
      page = 1,
      limit = 10,
      status,
      minScore,
      maxScore,
      startDate,
      endDate,
      minTime,
      maxTime,
    }: {
      page?: number;
      limit?: number;
      status?: 'passed' | 'failed';
      minScore?: number;
      maxScore?: number;
      startDate?: string; // ISO string or yyyy-mm-dd
      endDate?: string;
      minTime?: number;
      maxTime?: number;
    }
  ) {
    const qb = this.attemptRepo
      .createQueryBuilder('attempt')
      .leftJoin('attempt.user', 'user')
      .leftJoin('user.profile', 'userProfile')
      .leftJoin('attempt.courseStudent', 'courseStudent')
      .leftJoin('courseStudent.student', 'student')
      .leftJoin('student.profile', 'studentProfile')
      .select(
        `COALESCE(userProfile.firstName || ' ' || userProfile.lastName, 
           studentProfile.firstName || ' ' || studentProfile.lastName)`,
        'student_name',
      )
      .addSelect(`COALESCE(user.email, student.email)`, 'email')
      .addSelect(`attempt."created_at"`, 'date')
      .addSelect(`attempt."timeTaken"`, 'time_taken')
      .addSelect(`attempt."score"`, 'score')
      .addSelect(
        `COUNT(attempt.id) OVER (PARTITION BY COALESCE(user.id, student.id))`,
        'plays',
      )
      .addSelect(
        `CASE WHEN attempt.passed = true THEN 'passed' ELSE 'failed' END`,
        'status',
      )
      .where('attempt.quiz_id = :quizId', { quizId });

    // ---- Apply filters ----
    if (status) {
      qb.andWhere(`CASE WHEN attempt.passed = true THEN 'passed' ELSE 'failed' END = :status`, {
        status,
      });
    }

    if (minScore !== undefined) {
      qb.andWhere('attempt.score >= :minScore', { minScore });
    }
    if (maxScore !== undefined) {
      qb.andWhere('attempt.score <= :maxScore', { maxScore });
    }

    if (startDate) {
      qb.andWhere('attempt."created_at" >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('attempt."created_at" <= :endDate', { endDate });
    }

    if (minTime !== undefined) {
      qb.andWhere('attempt."timeTaken" >= :minTime', { minTime });
    }
    if (maxTime !== undefined) {
      qb.andWhere('attempt."timeTaken" <= :maxTime', { maxTime });
    }

    // ---- Sorting ----
    qb.orderBy('student_name')
      .addOrderBy('attempt."created_at"', 'ASC');

    // ---- Pagination ----
    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [data, total] = await Promise.all([
      qb.getRawMany(),
      qb.getCount(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getQuizOverview(quizId: string) {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: [
        'quizQuestions',
        'quizQuestions.question',
        'instructor',
        'instructor.profile',
      ],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    // Query attempts and count distinct students via user_id or course_student_id
    const stats = await this.attemptRepo
      .createQueryBuilder('attempt')
      .leftJoin('attempt.courseStudent', 'courseStudent')
      .leftJoin('courseStudent.student', 'student')
      .select(
        // distinct across direct user_id OR course_student.student_id
        `COUNT(DISTINCT COALESCE(attempt.user_id, student.id))`,
        'totalStudents',
      )
      .addSelect('AVG(attempt.score)', 'avgScore')
      .addSelect('AVG(attempt.timeTaken)', 'avgTime')
      .where('attempt.quiz_id = :quizId', { quizId })
      .getRawOne();

    const { totalStudents, avgScore, avgTime } = stats;

    // --- Enrollment count (total attempts) ---
    const enrollments = await this.attemptRepo.count({
      where: { quiz: { id: quizId } },
    });

    return {
      id: quiz.id,
      title: quiz.title,
      retakes: quiz.retakes,
      passingScore: quiz.passing_score,
      answerTime: quiz.answer_time,
      instructor: quiz.instructor?.profile
        ? {
          id: quiz.instructor.id,
          firstName: quiz.instructor.profile.firstName,
          lastName: quiz.instructor.profile.lastName,
          fullName: `${quiz.instructor.profile.firstName} ${quiz.instructor.profile.lastName}`,
          email: quiz.instructor.email,
        }
        : null,
      numberOfQuestions: quiz.quizQuestions?.length || 0,
      questions: quiz.quizQuestions?.map((qq) => ({
        id: qq.question.id,
        text: qq.question.text,
        type: qq.question.type,
        order: qq.order,
      })),
      totalStudents: Number(totalStudents) || 0,
      averageScore: avgScore ? Number(avgScore).toFixed(2) : null,
      averageTimeTaken: avgTime ? Number(avgTime).toFixed(2) : null,
      enrollments,
    };
  }

  async getQuizQuestionStats(quizId: string) {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: ['quizQuestions', 'quizQuestions.question'],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    const attempts = await this.attemptRepo.find({
      where: { quiz: { id: quizId } },
    });

    if (!attempts.length) {
      return {
        quizId: quiz.id,
        title: quiz.title,
        questions: quiz.quizQuestions.map((qq) => ({
          questionId: qq.question.id,
          text: qq.question.text,
          type: qq.question.type,
          answers: (qq.question.answers || []).map((opt) => ({
            text: opt.text,
            correct: opt.correct,
            chosenCount: 0,
            chosenPercentage: '0.00',
          })),
          correctCount: 0,
          incorrectCount: 0,
          correctPercentage: '0.00',
        })),
      };
    }

    const questionStats = quiz.quizQuestions.map((qq) => {
      const q = qq.question;

      // Initialize count map for each answer choice
      const optionCounts: Record<string, number> = {};
      for (const option of q.answers || []) {
        optionCounts[option.text] = 0;
      }

      let correctCount = 0;
      let incorrectCount = 0;

      for (const attempt of attempts) {
        for (const ans of attempt.answers || []) {
          if (ans.questionId === q.id) {
            if (ans.correct) correctCount++;
            else incorrectCount++;

            if (
              ans.chosenOptionText &&
              optionCounts.hasOwnProperty(ans.chosenOptionText)
            ) {
              optionCounts[ans.chosenOptionText]++;
            }
          }
        }
      }

      const totalAnswered = correctCount + incorrectCount;

      const optionsWithStats = (q.answers || []).map((opt) => ({
        text: opt.text,
        correct: opt.correct,
        chosenCount: optionCounts[opt.text],
        chosenPercentage:
          totalAnswered > 0
            ? ((optionCounts[opt.text] / totalAnswered) * 100).toFixed(2)
            : '0.00',
      }));

      return {
        questionId: q.id,
        text: q.text,
        type: q.type,
        answers: optionsWithStats,
        correctCount,
        incorrectCount,
        correctPercentage:
          totalAnswered > 0
            ? ((correctCount / totalAnswered) * 100).toFixed(2)
            : '0.00',
      };
    });

    return {
      quizId: quiz.id,
      title: quiz.title,
      questions: questionStats,
    };
  }

  async getAttemptsForStudent(
    quizId: string,
    studentId: string,
    userId: string,
    role: string,
    academyId: string,
  ): Promise<QuizAttempt[]> {
    // 1️⃣ Load quiz for ownership validation
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId, deleted_at: null },
      relations: ['academy'],
    });

    if (!quiz) throw new NotFoundException('Quiz not found');

    // 2️⃣ Check access
    if (role === 'student') {
      // students can only access their own attempts
      if (studentId !== userId) {
        throw new ForbiddenException('You can only view your own attempts');
      }
    } else {
      // instructors, academy admins, admins, etc.
      this.checkOwnership(quiz, userId, academyId, role);
    }

    // 3️⃣ Return all attempts for that student on that quiz
    return this.attemptRepo
      .createQueryBuilder('attempt')
      .leftJoin('attempt.quiz', 'quiz')
      .leftJoinAndSelect('attempt.courseStudent', 'courseStudent')
      .leftJoinAndSelect('courseStudent.student', 'student')
      .where('attempt.quiz_id = :quizId', { quizId })
      .andWhere('(student.id = :studentId)', { studentId })
      .orderBy('attempt.created_at', 'DESC')
      .getMany();
  }

  async getLatestQuizzesForStudent(userId: string, limit = 2) {
    const courseStudentRepo = this.dataSource.getRepository(CourseStudent);
    const attemptRepo = this.dataSource.getRepository(QuizAttempt);

    // 0️⃣ Get all course_student ids for this user
    const csRows = await courseStudentRepo
      .createQueryBuilder('cs')
      .select(['cs.id AS id'])
      .where('cs.student_id = :userId', { userId })
      .getRawMany();

    const csIds = csRows.map((r) => r.id);
    if (!csIds.length) return [];

    // 1️⃣ Subquery: latest attempt timestamp per quiz
    const subQuery = attemptRepo
      .createQueryBuilder('a')
      .select('MAX(a.created_at)', 'latest')
      .addSelect('a.quiz_id', 'quiz_id')
      .where('a.course_student_id IN (:...csIds)', { csIds })
      .groupBy('a.quiz_id');

    // 2️⃣ Main query: join quiz + course
    const recentAttempts = await attemptRepo
      .createQueryBuilder('attempt')
      .innerJoinAndSelect('attempt.quiz', 'quiz')
      .leftJoinAndSelect('attempt.courseStudent', 'courseStudent')
      .leftJoinAndSelect('courseStudent.course', 'course')
      .innerJoin(
        '(' + subQuery.getQuery() + ')',
        'latest_per_quiz',
        'latest_per_quiz.quiz_id = attempt.quiz_id AND latest_per_quiz.latest = attempt.created_at'
      )
      .setParameters(subQuery.getParameters())
      .andWhere('attempt.course_student_id IN (:...csIds)', { csIds })
      .orderBy('attempt.created_at', 'DESC')
      .limit(limit)
      .getMany();

    // 3️⃣ Format the response
    return recentAttempts.map((attempt) => ({
      quizId: attempt.quiz.id,
      quizTitle: attempt.quiz.title,
      quizStatus: attempt.quiz.status,
      passingScore: attempt.quiz.passing_score,
      score: attempt.score,
      passed: attempt.passed,
      attemptedAt: attempt.created_at ?? (attempt as any).created_at,
      course: attempt.courseStudent?.course
        ? {
          id: attempt.courseStudent.course.id,
          name: attempt.courseStudent.course.name,
          slug: attempt.courseStudent.course.slug,
        }
        : null,
    }));
  }

  async getQuizAdminOverview(quizId: string) {
    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: [
        'quizQuestions',
        'quizQuestions.question',
        'instructor',
        'instructor.profile',
      ],
    });

    if (!quiz) {
      throw new NotFoundException(`Quiz with ID ${quizId} not found`);
    }

    const totalQuestions = quiz.quizQuestions?.length || 0;

    // First, let's try a simple count to see if the basic query works
    const simpleStats = await this.attemptRepo
      .createQueryBuilder('attempt')
      .select('COUNT(attempt.id)', 'totalattempts')
      .where('attempt.quiz_id = :quizId', { quizId })
      .getRawOne();

    console.log('Simple stats:', simpleStats);

    // Now let's try the full query with simpler column names
    const statsQuery = this.attemptRepo
      .createQueryBuilder('attempt')
      .leftJoin('attempt.courseStudent', 'courseStudent')
      .leftJoin('courseStudent.student', 'student')
      .select([
        'COUNT(attempt.id) as total_attempts',
        'AVG(attempt.score) as avg_score',
        'AVG(attempt.timeTaken) as avg_time',
      ])
      .where('attempt.quiz_id = :quizId', { quizId });

    // Passed attempts: where "passed" column is true
    const passedAttemptsQuery = this.attemptRepo
      .createQueryBuilder('attempt')
      .select('COUNT(attempt.id)', 'passed_attempts')
      .where('attempt.quiz_id = :quizId', { quizId })
      .andWhere('attempt.passed = :passed', { passed: true });

    // For JSON column type, we need to use json_array_length (not jsonb_array_length)
    // But let's use a safer approach - get all attempts and filter in JavaScript
    const allAttempts = await this.attemptRepo.find({
      where: { quiz: { id: quizId } },
      select: ['id', 'answers']
    });

    // Count completed attempts in JavaScript (where answers length = total questions)
    const completedAttemptsNum = allAttempts.filter(attempt =>
      attempt.answers && Array.isArray(attempt.answers) && attempt.answers.length === totalQuestions
    ).length;

    // Count unique students
    const uniqueStudentsQuery = this.attemptRepo
      .createQueryBuilder('attempt')
      .leftJoin('attempt.courseStudent', 'courseStudent')
      .select('COUNT(DISTINCT courseStudent.student_id)', 'unique_students')
      .where('attempt.quiz_id = :quizId', { quizId });

    // Execute remaining queries in parallel
    const [
      basicStats,
      passedStats,
      uniqueStudentsStats
    ] = await Promise.all([
      statsQuery.getRawOne(),
      passedAttemptsQuery.getRawOne(),
      uniqueStudentsQuery.getRawOne()
    ]);

    // Extract values with proper fallbacks
    const totalAttemptsNum = Number(basicStats?.total_attempts) || 0;
    const avgScore = basicStats?.avg_score || 0;
    const avgTime = basicStats?.avg_time || 0;
    const passedAttemptsNum = Number(passedStats?.passed_attempts) || 0;
    const totalStudents = Number(uniqueStudentsStats?.unique_students) || 0;

    // Calculate rates
    const passRate = totalAttemptsNum > 0 ? (passedAttemptsNum / totalAttemptsNum) * 100 : 0;
    const completionRate = totalAttemptsNum > 0 ? (completedAttemptsNum / totalAttemptsNum) * 100 : 0;

    // Get question order type
    const questionOrder = quiz.randomize_questions ? 'random' : 'fixed';

    // Get feedback type
    const feedbackType = quiz.immediate_feedback ? 'immediate' : 'delayed';

    return {
      // Basic Quiz Info
      id: quiz.id,
      title: quiz.title,
      status: quiz.status,
      instructions: quiz.instructions,

      // Quiz Settings
      timeLimit: quiz.answer_time,
      timeLimitType: quiz.answer_time_type,
      retakes: quiz.retakes,
      passingScore: quiz.passing_score,
      questionOrder: questionOrder,
      feedbackType: feedbackType,
      randomizeAnswers: quiz.randomize_answers,
      attemptMode: quiz.attempt_mode,
      availability: quiz.availability,
      startDate: quiz.start_date,
      endDate: quiz.end_date,

      // Questions Information
      totalQuestions: totalQuestions,
      questions: quiz.quizQuestions?.map((qq) => ({
        id: qq.question.id,
        text: qq.question.text,
        type: qq.question.type,
        imageUrl: qq.question.image_url,
        points: qq.question.points,
        explanation: qq.question.explanation,
        order: qq.order,
        answers: qq.question.answers || [],
      })) || [],

      // Instructor Information
      instructor: quiz.instructor?.profile
        ? {
          id: quiz.instructor.id,
          firstName: quiz.instructor.profile.firstName,
          lastName: quiz.instructor.profile.lastName,
          fullName: `${quiz.instructor.profile.firstName} ${quiz.instructor.profile.lastName}`,
          email: quiz.instructor.email,
          photoUrl: quiz.instructor.profile.photoUrl,
        }
        : null,

      // Statistics
      totalAttempts: totalAttemptsNum,
      totalStudents: totalStudents,
      averageScore: avgScore ? parseFloat(avgScore).toFixed(2) : '0.00',
      averageTimeTaken: avgTime ? parseFloat(avgTime).toFixed(2) : '0.00',
      completionRate: parseFloat(completionRate.toFixed(2)),
      passRate: parseFloat(passRate.toFixed(2)),
    };
  }
}
