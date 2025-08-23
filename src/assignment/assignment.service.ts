import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { UserRole } from 'src/user/entities/user.entity';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { CourseProgress } from 'src/course/entities/course-progress.entity';
import {
  CourseSectionItem,
  CurriculumType,
} from 'src/course/course-section/entities/course-section-item.entity';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(CourseStudent)
    private readonly courseStudentRepo: Repository<CourseStudent>,
    @InjectRepository(CourseProgress)
    private progressRepo: Repository<CourseProgress>,
    @InjectRepository(CourseSectionItem)
    private courseSectionItemRepo: Repository<CourseSectionItem>,
    @InjectRepository(AssignmentSubmission)
    private submissionRepo: Repository<AssignmentSubmission>,
  ) {}

  async create(dto: CreateAssignmentDto, creatorId: string) {
    const assignment = this.assignmentRepo.create({
      ...dto,
      createdBy: creatorId,
    });
    const saved = await this.assignmentRepo.save(assignment);
    return this.toResponse(saved);
  }

  async findAllForUser(requesterId: string, role: UserRole) {
    const where =
      role === UserRole.ADMIN || role === UserRole.ACCOUNT_ADMIN
        ? {}
        : { createdBy: requesterId };

    const list = await this.assignmentRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
    return list.map(this.toResponse);
  }

  async findOneForUser(id: string, requesterId: string, role: UserRole) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    this.assertOwnershipOrAdmin(assignment, requesterId, role);
    return this.toResponse(assignment);
  }

  async updateForUser(
    id: string,
    dto: UpdateAssignmentDto,
    requesterId: string,
    role: UserRole,
  ) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    this.assertOwnershipOrAdmin(assignment, requesterId, role);

    Object.assign(assignment, dto);
    const saved = await this.assignmentRepo.save(assignment);
    return this.toResponse(saved);
  }

  async removeForUser(id: string, requesterId: string, role: UserRole) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    this.assertOwnershipOrAdmin(assignment, requesterId, role);

    await this.assignmentRepo.delete(assignment.id);
    return { id, message: 'Assignment deleted' };
  }

  // ---- helpers ----

  private assertOwnershipOrAdmin(
    assignment: Assignment,
    requesterId: string,
    role: UserRole,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.ACCOUNT_ADMIN;
    const isOwner = assignment.createdBy === requesterId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You do not have access to this assignment');
    }
  }

  private toResponse = (a: Assignment) => ({
    id: a.id,
    name: a.name,
    start_date: a.start_date,
    end_date: a.end_date,
    instructions: a.instructions,
    //grading_scale: a.grading_scale,
    attachment_url: a.attachment_url,
    createdAt: (a as any).created_at, // from your BasicEntity
    createdById: a.createdBy,
  });

  async submitAssignment(
    courseId: string,
    assignmentId: string,
    studentId: string,
    dto: SubmitAssignmentDto,
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
      notes: dto.notes,
      file_url: dto.file_url,
    });

    await this.submissionRepo.save(submission);

    // Update course progress
    let progress = await this.progressRepo.findOne({
      where: { item: { assignment: { id: assignmentId } }, courseStudent },
    });

    if (!progress) {
      const item = await this.courseSectionItemRepo.findOne({
        where: { assignment: { id: assignmentId } },
      });
      if (item) {
        progress = this.progressRepo.create({
          courseStudent,
          item,
          completed: true,
        });
        await this.progressRepo.save(progress);
      }
    } else {
      progress.completed = true;
      await this.progressRepo.save(progress);
    }

    return submission;
  }

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

  async updateSubmissionScore(
    courseId: string,
    assignmentId: string,
    submissionId: string,
    teacherId: string,
    score: number,
  ): Promise<AssignmentSubmission> {
    // Verify assignment exists and belongs to the teacher
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.createdBy !== teacherId) {
      throw new ForbiddenException(
        'You are not allowed to grade this assignment',
      );
    }

    // Fetch the submission
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['courseStudent'],
    });
    if (!submission) throw new NotFoundException('Submission not found');

    // Update the score and mark as graded
    submission.score = score;
    submission.graded = true;
    await this.submissionRepo.save(submission);

    // Fetch existing course progress for this assignment & student
    const progress = await this.progressRepo
      .createQueryBuilder('progress')
      .innerJoinAndSelect('progress.item', 'item')
      .where('item.assignment_id = :assignmentId', { assignmentId })
      .andWhere('progress.course_student_id = :studentId', {
        studentId: submission.courseStudent.id,
      })
      .getOne();

    if (progress) {
      // Update existing progress
      progress.score = score;
      progress.completed = true;
      await this.progressRepo.save(progress);
    } else {
      // Optional: only create if you want to handle missing progress
      const item = await this.courseSectionItemRepo.findOne({
        where: { assignment: { id: assignmentId } },
      });
      if (item) {
        const newProgress = this.progressRepo.create({
          courseStudent: submission.courseStudent,
          item,
          completed: true,
          score,
        });
        await this.progressRepo.save(newProgress);
      }
    }

    return submission;
  }
}
