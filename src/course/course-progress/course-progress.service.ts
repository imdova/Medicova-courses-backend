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
import { Quiz } from 'src/quiz/entities/quiz.entity';
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

    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,

    @InjectRepository(AssignmentSubmission)
    private readonly submissionRepo: Repository<AssignmentSubmission>,
  ) {}

  /**
   * Unified entry point for lecture, quiz, and assignment submissions.
   */
  async submitItemProgress(
    courseId: string,
    itemId: string,
    studentId: string,
    dto: SubmitCourseItemDto,
  ): Promise<CourseProgress> {
    // 1️⃣ Validate enrollment
    const courseStudent = await this.courseStudentRepo.findOne({
      where: { course: { id: courseId }, student: { id: studentId } },
    });
    if (!courseStudent) throw new NotFoundException('Student not enrolled');

    // 2️⃣ Find course item
    const item = await this.courseSectionItemRepo.findOne({
      where: { id: itemId },
      relations: ['quiz', 'assignment', 'lecture'],
    });
    if (!item) throw new NotFoundException('Course item not found');

    let score: number | undefined;

    // 3️⃣ Handle per item type
    if (item.curriculumType === CurriculumType.LECTURE) {
      if (!item.lecture)
        throw new BadRequestException('This item is not a lecture');
      // just mark completed
    } else if (item.curriculumType === CurriculumType.QUIZ) {
      if (!item.quiz) throw new BadRequestException('This item is not a quiz');
      const attempt = await this.submitQuizAttempt(
        courseId,
        item.quiz.id,
        studentId,
        dto,
      );
      score = attempt.score;
    } else if (item.curriculumType === CurriculumType.ASSIGNMENT) {
      if (!item.assignment)
        throw new BadRequestException('This item is not an assignment');
      await this.submitAssignment(courseId, item.assignment.id, studentId, dto);
    } else {
      throw new BadRequestException('Unsupported item type');
    }

    // 4️⃣ Update course progress
    let progress = await this.progressRepo.findOne({
      where: { item: { id: itemId }, courseStudent },
    });

    if (!progress) {
      progress = this.progressRepo.create({
        courseStudent,
        item,
        completed: true,
        score,
      });
    } else {
      progress.completed = true;
      if (score !== undefined) progress.score = score;
    }

    return this.progressRepo.save(progress);
  }

  /**
   * Handles quiz submission + attempt saving.
   */
  private async submitQuizAttempt(
    courseId: string,
    quizId: string,
    studentId: string,
    dto: SubmitCourseItemDto,
  ): Promise<QuizAttempt> {
    const courseStudent = await this.courseStudentRepo.findOne({
      where: { course: { id: courseId }, student: { id: studentId } },
    });
    if (!courseStudent) throw new NotFoundException('Student not enrolled');

    const quiz = await this.quizRepo.findOne({
      where: { id: quizId },
      relations: ['quizQuestions', 'quizQuestions.question'],
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    let score = 0;
    let totalPoints = 0;

    for (const qq of quiz.quizQuestions) {
      totalPoints += qq.question.points;
      const answer = dto.answers?.find((a) => a.questionId === qq.question.id);
      if (answer?.correct) score += qq.question.points;
    }

    const percentageScore = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
    const passed = quiz.passing_score
      ? percentageScore >= quiz.passing_score
      : true;

    const attempt = this.attemptRepo.create({
      quiz,
      courseStudent,
      answers: dto.answers,
      score: percentageScore,
      passed,
    });
    return this.attemptRepo.save(attempt);
  }

  /**
   * Handles assignment submission.
   */
  private async submitAssignment(
    courseId: string,
    assignmentId: string,
    studentId: string,
    dto: SubmitCourseItemDto,
  ): Promise<AssignmentSubmission> {
    const courseStudent = await this.courseStudentRepo.findOne({
      where: { course: { id: courseId }, student: { id: studentId } },
    });
    if (!courseStudent) throw new NotFoundException('Student not enrolled');

    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submission = this.submissionRepo.create({
      assignment,
      courseStudent,
      notes: dto.assignmentSubmission?.notes,
      file_url: dto.assignmentSubmission?.file_url,
    });

    return this.submissionRepo.save(submission);
  }

  async getCourseProgress(courseId: string, studentId: string) {
    // 1️⃣ Validate enrollment
    const courseStudent = await this.courseStudentRepo.findOne({
      where: { course: { id: courseId }, student: { id: studentId } },
    });
    if (!courseStudent) throw new NotFoundException('Student not enrolled');

    // 2️⃣ Get all items in course
    const items = await this.courseSectionItemRepo.find({
      where: { section: { course: { id: courseId } } },
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

    // 4️⃣ Compute counts
    const completedCount = progressRecords.filter((p) => p.completed).length;
    const totalCount = items.length;
    const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return {
      courseId,
      studentId,
      totalItems: totalCount,
      completedItems: completedCount,
      progressPercentage: percentage,
      items: items.map((item) => {
        const record = progressRecords.find((p) => p.item.id === item.id);
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
