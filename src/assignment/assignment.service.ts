import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CourseProgress } from 'src/course/course-progress/entities/course-progress.entity';
import {
  CourseSectionItem,
  CurriculumType,
} from 'src/course/course-section/entities/course-section-item.entity';
import { QueryConfig } from 'src/common/utils/query-options';
import { FilterOperator, paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { EmailService } from '../common/email.service';
import { CourseStudent } from 'src/course/entities/course-student.entity';

export const ASSIGNMENT_PAGINATION_CONFIG: QueryConfig<Assignment> = {
  sortableColumns: ['created_at', 'name', 'start_date', 'end_date'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    name: [FilterOperator.ILIKE],       // search by name
    createdBy: [FilterOperator.EQ],     // filter by creator
    'academy.id': [FilterOperator.EQ],  // filter by academy
    start_date: [FilterOperator.GTE, FilterOperator.LTE],
    end_date: [FilterOperator.GTE, FilterOperator.LTE],
  },
  relations: ['academy', 'submissions'],
};


@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(AssignmentSubmission)
    private readonly assignmentSubmissionRepo: Repository<AssignmentSubmission>,
    @InjectRepository(CourseStudent)
    private readonly courseStudentRepo: Repository<CourseStudent>,
    @InjectRepository(CourseSectionItem)
    private courseSectionItemRepo: Repository<CourseSectionItem>,
    private readonly emailService: EmailService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

  async create(
    dto: CreateAssignmentDto,
    creatorId: string,
    academyId?: string,
  ) {
    const assignment = this.assignmentRepo.create({
      ...dto,
      createdBy: creatorId,
      academy: { id: academyId },
    });
    const saved = await this.assignmentRepo.save(assignment);
    return this.toResponse(saved);
  }

  async findAllForUser(
    query: PaginateQuery,
    requesterId: string,
    role: string,
    academyId?: string,
  ): Promise<Paginated<Assignment>> {
    const qb = this.assignmentRepo.createQueryBuilder('assignment');
    qb.leftJoinAndSelect('assignment.academy', 'academy')
      .leftJoinAndSelect('assignment.submissions', 'submissions')
      .andWhere('assignment.deleted_at IS NULL'); // in case you're using soft delete

    // 🔑 Role-based restrictions
    if (role === 'admin') {
      // admins see everything
    } else if (role === 'academy_admin') {
      qb.andWhere('assignment.academy_id = :academyId', { academyId });
    } else {
      // instructors, academy users → only their own assignments
      qb.andWhere('assignment.created_by = :requesterId', { requesterId });
    }

    return paginate(query, qb, ASSIGNMENT_PAGINATION_CONFIG);
  }

  async findOneForUser(
    id: string,
    requesterId: string,
    role: string,
    academyId?: string,
  ) {
    let assignment: Assignment | null = null;

    if (role === 'admin') {
      assignment = await this.assignmentRepo.findOne({ where: { id } });
    } else if (role === 'academy_admin') {
      assignment = await this.assignmentRepo.findOne({
        where: { id, academy: { id: academyId } },
      });
    } else {
      assignment = await this.assignmentRepo.findOne({
        where: { id, createdBy: requesterId },
      });
    }

    if (!assignment) {
      throw new ForbiddenException('You do not have access to this assignment');
    }

    return this.toResponse(assignment);
  }

  async updateForUser(
    id: string,
    dto: UpdateAssignmentDto,
    requesterId: string,
    role: string,
    academyId?: string,
  ) {
    let assignment: Assignment | null = null;

    if (role === 'admin') {
      assignment = await this.assignmentRepo.findOne({ where: { id } });
    } else if (role === 'academy_admin') {
      assignment = await this.assignmentRepo.findOne({
        where: { id, academy: { id: academyId } },
      });
    } else {
      assignment = await this.assignmentRepo.findOne({
        where: { id, createdBy: requesterId },
      });
    }

    if (!assignment) {
      throw new ForbiddenException(
        'You do not have access to update this assignment',
      );
    }

    Object.assign(assignment, dto);
    const saved = await this.assignmentRepo.save(assignment);
    return this.toResponse(saved);
  }

  async removeForUser(
    id: string,
    requesterId: string,
    role: string,
    academyId?: string,
  ) {
    let assignment: Assignment | null = null;

    if (role === 'admin') {
      assignment = await this.assignmentRepo.findOne({ where: { id } });
    } else if (role === 'academy_admin') {
      assignment = await this.assignmentRepo.findOne({
        where: { id, academy: { id: academyId } },
      });
    } else {
      assignment = await this.assignmentRepo.findOne({
        where: { id, createdBy: requesterId },
      });
    }

    if (!assignment) {
      throw new ForbiddenException(
        'You do not have access to delete this assignment',
      );
    }

    await this.assignmentRepo.delete(assignment.id);
    return { id, message: 'Assignment deleted' };
  }

  // ---- helpers ----

  private toResponse = (a: Assignment) => ({
    id: a.id,
    name: a.name,
    start_date: a.start_date,
    end_date: a.end_date,
    instructions: a.instructions,
    //grading_scale: a.grading_scale,
    attachment_url: a.attachment_url,
    createdAt: (a as any).created_at, // from your BasicEntity
    createdBy: a.createdBy,
  });

  async getAllAssignmentsWithSubmissions(courseId: string) {
    // 1️⃣ Fetch all CourseSectionItems of type 'assignment' for the course
    const assignmentItems = await this.courseSectionItemRepo.find({
      where: {
        section: { course: { id: courseId } },
        curriculumType: CurriculumType.ASSIGNMENT,
      },
      relations: [
        'assignment',
        'assignment.submissions',
        'assignment.submissions.courseStudent',
        'assignment.submissions.courseStudent.student',
        'assignment.submissions.courseStudent.student.profile',
      ],
      order: { order: 'ASC' },
    });

    // 2️⃣ Return the assignment entities directly
    return assignmentItems.map((item) => item.assignment).filter(Boolean); // just in case some items have no assignment
  }

  // Refactored
  async updateSubmissionScore(
    assignmentId: string,
    submissionId: string,
    teacherId: string,
    score: number,
  ): Promise<AssignmentSubmission> {
    return this.dataSource.transaction(async (manager) => {
      // Verify assignment exists AND belongs to teacher
      const assignment = await manager.getRepository(Assignment).findOne({
        where: { id: assignmentId, createdBy: teacherId },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'Assignment not found or not owned by you',
        );
      }

      // Update submission score directly
      const result = await manager
        .getRepository(AssignmentSubmission)
        .update({ id: submissionId }, { score, graded: true });
      if (!result.affected) throw new NotFoundException('Submission not found');

      // Fetch submission with relations (for return + progress creation)
      const submission = await manager
        .getRepository(AssignmentSubmission)
        .findOne({
          where: { id: submissionId },
          relations: ['courseStudent'],
        });

      // Check progress
      let progress = await manager
        .getRepository(CourseProgress)
        .createQueryBuilder('progress')
        .innerJoinAndSelect('progress.item', 'item')
        .where('item.assignment_id = :assignmentId', { assignmentId })
        .andWhere('progress.course_student_id = :studentId', {
          studentId: submission.courseStudent.id,
        })
        .getOne();

      if (progress) {
        progress.score = score;
        progress.completed = true;
        await manager.getRepository(CourseProgress).save(progress);
      } else {
        const item = await manager.getRepository(CourseSectionItem).findOne({
          where: { assignment: { id: assignmentId } },
        });
        if (item) {
          progress = manager.getRepository(CourseProgress).create({
            courseStudent: submission.courseStudent,
            item,
            completed: true,
            score,
          });
          await manager.getRepository(CourseProgress).save(progress);
        }
      }

      return submission;
    });
  }

  async sendReminderToStudents(
    assignmentId: string,
    userId: string,
    role: string,
    academyId?: string,
    optionalMessage?: string, // <-- new parameter
  ) {
    // 1️⃣ Find the assignment and check permissions
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: ['academy'],
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (role === 'instructor' && assignment.createdBy !== userId) {
      throw new ForbiddenException('Not allowed to send reminders for this assignment');
    }
    if ((role === 'academy_admin' || role === 'academy_user') && assignment.academy?.id !== academyId) {
      throw new ForbiddenException('Not allowed to send reminders for this assignment');
    }

    // 2️⃣ Get unique students
    const students = await this.courseSectionItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.assignment', 'assignment')
      .innerJoin('item.section', 'section')
      .innerJoin('section.course', 'course')
      .innerJoin('course.enrollments', 'enrollment')
      .innerJoin('enrollment.student', 'student')
      .leftJoin('student.profile', 'profile')
      .select([
        'DISTINCT student.id as "studentId"',
        'student.email as email',
        'COALESCE(TRIM(CONCAT(profile.firstName, \' \', profile.lastName)), \'Student\') as name',
      ])
      .where('assignment.id = :assignmentId', { assignmentId })
      .andWhere('student.email IS NOT NULL')
      .getRawMany();

    if (students.length === 0) {
      return { message: 'No students to send reminders to' };
    }

    // 3️⃣ Send emails in batches
    const batchSize = 10;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      const emailPromises = batch.map(student =>
        this.emailService.sendEmail({
          from: process.env.SMTP_DEMO_EMAIL,
          to: student.email,
          subject: `Reminder: ${assignment.name}`,
          template: 'assignment-reminder',
          context: {
            studentName: student.name || 'Student',
            assignmentName: assignment.name,
            startDate: assignment.start_date,
            endDate: assignment.end_date,
            instructions: assignment.instructions,
            message: optionalMessage || '', // <-- pass optional message to template
          },
        }),
      );
      await Promise.allSettled(emailPromises);
    }

    return { message: `Reminder emails sent to ${students.length} students` };
  }

  async getStudentStatsForAssignment(
    assignmentId: string,
    {
      page = 1,
      limit = 10,
      status,
      minScore,
      maxScore,
      startDate,
      endDate,
    }: {
      page?: number;
      limit?: number;
      status?: 'submitted' | 'graded';
      minScore?: number;
      maxScore?: number;
      startDate?: string; // ISO string
      endDate?: string;
    },
  ) {
    const qb = this.assignmentSubmissionRepo
      .createQueryBuilder('submission')
      .leftJoin('submission.courseStudent', 'courseStudent')
      .leftJoin('courseStudent.student', 'student')
      .leftJoin('student.profile', 'studentProfile')
      .select(
        `studentProfile.firstName || ' ' || studentProfile.lastName`,
        'student_name',
      )
      .addSelect('student.email', 'email')
      .addSelect('submission.created_at', 'date')
      .addSelect('submission.score', 'score')
      .addSelect(
        `CASE 
        WHEN submission.graded = false THEN 'submitted'
        ELSE 'graded'
      END`,
        'status',
      )
      .where('submission.assignment_id = :assignmentId', { assignmentId });

    // ---- Filters ----
    if (status) {
      qb.andWhere(
        `CASE 
        WHEN submission.graded = false THEN 'submitted'
        ELSE 'graded'
      END = :status`,
        { status },
      );
    }

    if (minScore !== undefined) {
      qb.andWhere('submission.score >= :minScore', { minScore });
    }
    if (maxScore !== undefined) {
      qb.andWhere('submission.score <= :maxScore', { maxScore });
    }

    if (startDate) {
      qb.andWhere('submission."created_at" >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('submission."created_at" <= :endDate', { endDate });
    }

    // ---- Sorting ----
    qb.orderBy('student_name', 'ASC').addOrderBy('submission."created_at"', 'ASC');

    // ---- Pagination ----
    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [data, total] = await Promise.all([qb.getRawMany(), qb.getCount()]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getAssignmentOverview(assignmentId: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
      relations: [
        'submissions',
        'submissions.courseStudent',
        'submissions.courseStudent.course',
        'submissions.courseStudent.student',
      ],
    });

    if (!assignment) {
      throw new NotFoundException(`Assignment with ID ${assignmentId} not found`);
    }

    // --- Stats from submissions ---
    // totalSubmissions = total rows
    // studentsSubmitted = DISTINCT students who submitted (a student may submit multiple times)
    const stats = await this.assignmentSubmissionRepo
      .createQueryBuilder('submission')
      .leftJoin('submission.courseStudent', 'courseStudent')
      .leftJoin('courseStudent.student', 'student')
      .select('COUNT(submission.id)', 'totalSubmissions')
      .addSelect('COUNT(DISTINCT student.id)', 'studentsSubmitted')
      .addSelect('AVG(submission.score)', 'avgScore')
      .where('submission.assignment_id = :assignmentId', { assignmentId })
      .getRawOne();

    const totalSubmissions = Number(stats?.totalSubmissions ?? 0);
    const studentsSubmitted = Number(stats?.studentsSubmitted ?? 0);
    const avgScore = stats?.avgScore ? Number(stats.avgScore) : null;

    // --- Get course info from any submission (if exists) ---
    const firstSubmission = assignment.submissions?.[0];
    const course = firstSubmission?.courseStudent?.course;

    // --- Calculate submission rate based on enrolled students for the course ---
    let submissionRate: string | null = null;
    if (course) {
      const totalEnrolled = await this.courseStudentRepo.count({
        where: { course: { id: course.id } },
      });

      submissionRate =
        totalEnrolled > 0
          ? `${((studentsSubmitted / totalEnrolled) * 100).toFixed(2)}%`
          : '0%';
    }

    return {
      id: assignment.id,
      name: assignment.name,
      totalPoints: assignment.totalPoints,
      numberOfQuestions: assignment.numberOfQuestions,
      startDate: assignment.start_date,
      dueDate: assignment.end_date,
      totalSubmissions,           // total submission rows
      studentsSubmitted,          // distinct students who submitted
      averageScore: avgScore !== null ? Number(avgScore.toFixed(2)) : null,
      submissionRate,             // "%", or null if course unknown
      course: course ? { id: course.id, title: course.name } : null,
    };
  }
}
