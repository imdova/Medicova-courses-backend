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
import { User, UserRole } from 'src/user/entities/user.entity';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CourseProgress } from 'src/course/course-progress/entities/course-progress.entity';
import {
  CourseSectionItem,
  CurriculumType,
} from 'src/course/course-section/entities/course-section-item.entity';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(CourseProgress)
    private progressRepo: Repository<CourseProgress>,
    @InjectRepository(CourseSectionItem)
    private courseSectionItemRepo: Repository<CourseSectionItem>,
    @InjectRepository(AssignmentSubmission)
    private submissionRepo: Repository<AssignmentSubmission>,
  ) { }

  async create(dto: CreateAssignmentDto, creatorId: string) {
    const assignment = this.assignmentRepo.create({
      ...dto,
      createdBy: creatorId,
    });
    const saved = await this.assignmentRepo.save(assignment);
    return this.toResponse(saved);
  }

  async findAllForUser(requesterId: string, role: UserRole) {
    let query;

    if (role === UserRole.ADMIN) {
      // Admin → all assignments
      query = this.assignmentRepo
        .createQueryBuilder('assignment')
        .orderBy('assignment.created_at', 'DESC');
    } else if (role === UserRole.ACADEMY_ADMIN) {
      // Academy admin → assignments from same academy
      query = this.assignmentRepo
        .createQueryBuilder('assignment')
        .innerJoin(User, 'user', 'user.id = assignment.created_by')
        .where((qb) => {
          const subQuery = qb
            .subQuery()
            .select('u.academyId')
            .from(User, 'u')
            .where('u.id = :requesterId')
            .getQuery();
          return 'user.academyId = ' + subQuery;
        })
        .setParameter('requesterId', requesterId)
        .orderBy('assignment.created_at', 'DESC');
    } else {
      // Instructor OR Academy content creator → only their own assignments
      query = this.assignmentRepo
        .createQueryBuilder('assignment')
        .where('assignment.created_by = :requesterId', { requesterId })
        .orderBy('assignment.created_at', 'DESC');
    }

    const list = await query.getMany();
    return list.map(this.toResponse);
  }

  async findOneForUser(id: string, requesterId: string, role: UserRole) {
    if (role === UserRole.ADMIN) {
      // Admin → any assignment
      const assignment = await this.assignmentRepo.findOne({ where: { id } });
      if (!assignment) throw new NotFoundException('Assignment not found');
      return this.toResponse(assignment);
    }

    if (role === UserRole.ACADEMY_ADMIN) {
      // Academy admin → can only access if creator is in same academy
      const assignment = await this.assignmentRepo
        .createQueryBuilder('assignment')
        .innerJoin(User, 'creator', 'creator.id = assignment.created_by')
        .innerJoin(User, 'requester', 'requester.id = :requesterId', {
          requesterId,
        })
        .where('assignment.id = :id', { id })
        .andWhere('creator.academyId = requester.academyId')
        .getOne();

      if (!assignment) {
        throw new ForbiddenException(
          'You do not have access to this assignment',
        );
      }
      return this.toResponse(assignment);
    }

    // Instructor OR Academy content creator → only own assignments
    const assignment = await this.assignmentRepo.findOne({
      where: { id, createdBy: requesterId },
    });
    if (!assignment)
      throw new ForbiddenException('You do not have access to this assignment');
    return this.toResponse(assignment);
  }

  async updateForUser(
    id: string,
    dto: UpdateAssignmentDto,
    requesterId: string,
    role: UserRole,
  ) {
    let assignment: Assignment | null = null;

    if (role === UserRole.ADMIN) {
      // Admin → any assignment
      assignment = await this.assignmentRepo.findOne({ where: { id } });
    } else if (role === UserRole.ACADEMY_ADMIN) {
      // Academy Admin → assignment must belong to same academy
      assignment = await this.assignmentRepo
        .createQueryBuilder('assignment')
        .innerJoin(User, 'creator', 'creator.id = assignment.created_by')
        .innerJoin(User, 'requester', 'requester.id = :requesterId', {
          requesterId,
        })
        .where('assignment.id = :id', { id })
        .andWhere('creator.academyId = requester.academyId')
        .getOne();
    } else {
      // Instructor OR Academy content creator → only their own assignment
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

  async removeForUser(id: string, requesterId: string, role: UserRole) {
    let assignment: Assignment | null = null;

    if (role === UserRole.ADMIN) {
      // Admin → any assignment
      assignment = await this.assignmentRepo.findOne({ where: { id } });
    } else if (role === UserRole.ACADEMY_ADMIN) {
      // Academy Admin → assignment must belong to same academy
      assignment = await this.assignmentRepo
        .createQueryBuilder('assignment')
        .innerJoin(User, 'creator', 'creator.id = assignment.created_by')
        .innerJoin(User, 'requester', 'requester.id = :requesterId', {
          requesterId,
        })
        .where('assignment.id = :id', { id })
        .andWhere('creator.academyId = requester.academyId')
        .getOne();
    } else {
      // Instructor OR Academy content creator → only their own assignment
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

  async updateSubmissionScore(
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
