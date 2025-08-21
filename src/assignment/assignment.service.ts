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

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
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
}
