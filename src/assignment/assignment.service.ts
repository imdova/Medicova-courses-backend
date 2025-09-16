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

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(CourseSectionItem)
    private courseSectionItemRepo: Repository<CourseSectionItem>,
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
    requesterId: string,
    role: string,
    academyId?: string,
  ) {
    let assignments: Assignment[];

    if (role === 'admin') {
      // Admin → all assignments
      assignments = await this.assignmentRepo.find({
        order: { created_at: 'DESC' },
      });
    } else if (role === 'academy_admin') {
      // Academy admin → all assignments in their academy
      assignments = await this.assignmentRepo.find({
        where: { academy: { id: academyId } },
        order: { created_at: 'DESC' },
      });
    } else {
      // Instructor / academy_user → only their own
      assignments = await this.assignmentRepo.find({
        where: { createdBy: requesterId },
        order: { created_at: 'DESC' },
      });
    }

    return assignments.map(this.toResponse);
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
}
