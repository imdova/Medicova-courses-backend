import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseProgress } from './entities/course-progress.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import {
  CourseSectionItem,
  CurriculumType,
} from 'src/course/course-section/entities/course-section-item.entity';
import { SubmitCourseItemDto } from './dto/submit-course-item.dto';
import { QuizAttempt } from 'src/quiz/entities/quiz-attempts.entity';
import { AssignmentSubmission } from 'src/assignment/entities/assignment-submission.entity';
import { AttemptMode, Quiz } from 'src/quiz/entities/quiz.entity';
import { Assignment } from 'src/assignment/entities/assignment.entity';

@Injectable()
export class CourseProgressService {
  constructor(
    @InjectRepository(CourseProgress)
    private readonly progressRepo: Repository<CourseProgress>,

    @InjectRepository(CourseStudent)
    private readonly courseStudentRepo: Repository<CourseStudent>,

    @InjectRepository(CourseSectionItem)
    private readonly courseSectionItemRepo: Repository<CourseSectionItem>,

    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,

    @InjectRepository(QuizAttempt)
    private readonly attemptRepo: Repository<QuizAttempt>,

    @InjectRepository(AssignmentSubmission)
    private readonly submissionRepo: Repository<AssignmentSubmission>,
  ) { }

  /** ✅ Utility to fetch enrollment or throw */
  private async getEnrollment(courseId: string, studentId: string) {
    const cs = await this.courseStudentRepo.findOne({
      where: { course: { id: courseId }, student: { id: studentId } },
    });
    if (!cs) throw new NotFoundException('Student not enrolled');
    return cs;
  }

  /** ✅ Unified entry for lecture, quiz, and assignment */
  async submitItemProgress(
    courseId: string,
    itemId: string,
    studentId: string,
    dto: SubmitCourseItemDto,
  ): Promise<CourseProgress> {
    const courseStudent = await this.getEnrollment(courseId, studentId);

    // Load item + its relations
    const item = await this.courseSectionItemRepo.findOne({
      where: { id: itemId },
      relations: ['quiz', 'assignment', 'lecture'],
    });
    if (!item) throw new NotFoundException('Course item not found');

    let score: number | undefined;

    switch (item.curriculumType) {
      case CurriculumType.LECTURE:
        if (!item.lecture)
          throw new BadRequestException('This item is not a lecture');
        break;

      case CurriculumType.QUIZ: {
        if (!item.quiz)
          throw new BadRequestException('This item is not a quiz');

        const attempt = await this.handleQuizSubmission(
          courseStudent,
          item.quiz,
          dto,
        );
        score = attempt.score;
        break;
      }

      case CurriculumType.ASSIGNMENT: {
        if (!item.assignment)
          throw new BadRequestException('This item is not an assignment');
        await this.handleAssignmentSubmission(
          courseStudent,
          item.assignment,
          dto,
        );
        break;
      }

      default:
        throw new BadRequestException('Unsupported item type');
    }

    // ✅ Use upsert instead of findOne → create → save
    await this.progressRepo.upsert(
      {
        courseStudent,
        item,
        completed: true,
        score,
      },
      ['courseStudent', 'item'], // composite unique constraint
    );

    return this.progressRepo.findOne({
      where: { courseStudent: { id: courseStudent.id }, item: { id: item.id } },
    });
  }

  /** ✅ Centralized quiz submission with retake enforcement */
  private async handleQuizSubmission(
    courseStudent: CourseStudent,
    quiz: Quiz,
    dto: SubmitCourseItemDto,
  ): Promise<QuizAttempt> {
    const attemptCount = await this.attemptRepo.count({
      where: { quiz: { id: quiz.id }, courseStudent: { id: courseStudent.id } },
    });

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

    const fullQuiz = await this.quizRepo.findOne({
      where: { id: quiz.id },
      relations: ['quizQuestions', 'quizQuestions.question'],
    });
    if (!fullQuiz) throw new NotFoundException('Quiz not found');

    let score = 0;
    let totalPoints = 0;

    for (const qq of fullQuiz.quizQuestions) {
      totalPoints += qq.question.points;
      const answer = dto.answers?.find((a) => a.questionId === qq.question.id);
      if (answer?.correct) score += qq.question.points;
    }

    const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const passed = fullQuiz.passing_score
      ? percentage >= fullQuiz.passing_score
      : true;

    const attempt = this.attemptRepo.create({
      quiz,
      courseStudent,
      answers: dto.answers,
      score: percentage,
      passed,
      timeTaken: dto.timeTaken,  // ✅ new field
    });
    return this.attemptRepo.save(attempt);
  }

  /** ✅ Assignment submission */
  private async handleAssignmentSubmission(
    courseStudent: CourseStudent,
    assignment: Assignment,
    dto: SubmitCourseItemDto,
  ): Promise<AssignmentSubmission> {
    const submission = this.submissionRepo.create({
      assignment,
      courseStudent,
      notes: dto.assignmentSubmission?.notes,
      file_url: dto.assignmentSubmission?.file_url,
    });
    return this.submissionRepo.save(submission);
  }

  // Refactored
  async getCourseProgress(courseId: string, studentId: string) {
    // 1️⃣ Validate enrollment
    const courseStudent = await this.courseStudentRepo.findOne({
      where: { course: { id: courseId }, student: { id: studentId } },
    });
    if (!courseStudent) {
      throw new NotFoundException('Student not enrolled');
    }

    // 2️⃣ Get all items in course
    const items = await this.courseSectionItemRepo.find({
      where: { section: { course: { id: courseId } } },
      select: ['id', 'curriculumType'], // only fetch what we need
    });

    if (items.length === 0) {
      throw new NotFoundException('No curriculum items found for this course');
    }

    // 3️⃣ Get progress for this student
    const progressRecords = await this.progressRepo
      .createQueryBuilder('progress')
      .leftJoinAndSelect('progress.item', 'item')
      .leftJoin('item.section', 'section')
      .leftJoin('section.course', 'course')
      .where('progress.course_student_id = :courseStudentId', {
        courseStudentId: courseStudent.id,
      })
      .andWhere('course.id = :courseId', { courseId })
      .getMany();

    // 🔄 Convert to a Map for O(1) lookups
    const progressMap = new Map(progressRecords.map((p) => [p.item.id, p]));

    // 4️⃣ Compute counts
    const completedCount = progressRecords.filter((p) => p.completed).length;
    const totalCount = items.length;
    const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // 5️⃣ Build response
    return {
      courseId,
      studentId,
      totalItems: totalCount,
      completedItems: completedCount,
      progressPercentage: percentage,
      items: items.map((item) => {
        const record = progressMap.get(item.id);
        return {
          id: item.id,
          type: item.curriculumType,
          completed: record?.completed ?? false,
          score: record?.score ?? null,
        };
      }),
    };
  }
}
