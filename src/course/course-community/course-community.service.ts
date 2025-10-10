import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseCommunity } from './entities/course-community.entity';
import { CreateCourseCommunityDto } from './dto/create-course-community.dto';
import { UpdateCourseCommunityDto } from './dto/update-course-community.dto';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class CourseCommunityService {
  constructor(
    @InjectRepository(CourseCommunity)
    private readonly communityRepo: Repository<CourseCommunity>,

    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) { }

  // 🔹 Shared Access Check
  private async checkCommunityAccess(
    courseId: string,
    userId: string,
    academyId: string,
    role: string,
  ) {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['academy'],
    });

    if (!course) throw new NotFoundException('Course not found');

    // 🟢 Admin: full access
    if (role === 'admin') return;

    // 🟢 Academy Admin: can access courses in their academy
    if (role === 'academy_admin') {
      if (course.academy?.id !== academyId) {
        throw new ForbiddenException(
          'You cannot access courses outside your academy',
        );
      }
      return;
    }

    // 🟢 Instructor / Academy User: can access their own created courses
    if (['academy_user', 'instructor'].includes(role)) {
      if (course.createdBy !== userId) {
        throw new ForbiddenException(
          'You cannot access courses you did not create',
        );
      }
      return;
    }

    // 🟢 Student: must be enrolled in the course
    const enrollment = await this.courseRepo
      .createQueryBuilder('course')
      .innerJoin('course.enrollments', 'enrollment')
      .innerJoin('enrollment.student', 'student')
      .where('course.id = :courseId', { courseId })
      .andWhere('student.id = :userId', { userId })
      .getOne();

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }
  }

  // 🔹 CREATE COMMENT / REPLY
  async create(
    courseId: string,
    userId: string,
    academyId: string,
    role: string,
    dto: CreateCourseCommunityDto,
  ) {
    await this.checkCommunityAccess(courseId, userId, academyId, role);

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    let parentComment: CourseCommunity = null;
    if (dto.parentId) {
      parentComment = await this.communityRepo.findOne({
        where: { id: dto.parentId },
      });
      if (!parentComment)
        throw new NotFoundException('Parent comment not found');
    }

    const comment = this.communityRepo.create({
      content: dto.content,
      course,
      user,
      parent: parentComment || null,
    });

    const saved = await this.communityRepo.save(comment);
    return { message: 'Comment created successfully', data: saved };
  }

  // 🔹 GET ALL COMMENTS
  async findAll(
    courseId: string,
    userId: string,
    academyId: string,
    role: string,
  ) {
    await this.checkCommunityAccess(courseId, userId, academyId, role);

    const comments = await this.communityRepo.find({
      where: { course: { id: courseId }, parent: null },
      relations: ['user', 'replies', 'replies.user'],
      order: { created_at: 'DESC' },
    });

    return comments;
  }

  // 🔹 GET ONE COMMENT
  async findOne(
    courseId: string,
    id: string,
    userId: string,
    academyId: string,
    role: string,
  ) {
    await this.checkCommunityAccess(courseId, userId, academyId, role);

    const comment = await this.communityRepo.findOne({
      where: { id, course: { id: courseId } },
      relations: ['user', 'replies', 'replies.user', 'parent'],
    });

    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }

  // 🔹 UPDATE COMMENT
  async update(
    courseId: string,
    id: string,
    userId: string,
    academyId: string,
    role: string,
    dto: UpdateCourseCommunityDto,
  ) {
    await this.checkCommunityAccess(courseId, userId, academyId, role);

    const comment = await this.communityRepo.findOne({
      where: { id, course: { id: courseId } },
      relations: ['user'],
    });

    if (!comment) throw new NotFoundException('Comment not found');

    // Allow author, admin, or academy_admin
    if (
      comment.user.id !== userId &&
      !['admin', 'academy_admin'].includes(role)
    ) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = dto.content ?? comment.content;
    const updated = await this.communityRepo.save(comment);

    return { message: 'Comment updated successfully', data: updated };
  }

  // 🔹 DELETE COMMENT
  async remove(
    courseId: string,
    id: string,
    userId: string,
    academyId: string,
    role: string,
  ) {
    await this.checkCommunityAccess(courseId, userId, academyId, role);

    const comment = await this.communityRepo.findOne({
      where: { id, course: { id: courseId } },
      relations: ['user'],
    });

    if (!comment) throw new NotFoundException('Comment not found');

    // Allow author, admin, or academy_admin
    if (
      comment.user.id !== userId &&
      !['admin', 'academy_admin'].includes(role)
    ) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.communityRepo.remove(comment);
    return { message: 'Comment deleted successfully' };
  }

  // 🔹 INCREASE LIKE COUNT
  async likeComment(
    courseId: string,
    commentId: string,
    userId: string,
    academyId: string,
    role: string,
  ) {
    await this.checkCommunityAccess(courseId, userId, academyId, role);

    const comment = await this.communityRepo.findOne({
      where: { id: commentId, course: { id: courseId } },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    comment.likeCount += 1;
    await this.communityRepo.save(comment);

    return {
      message: 'Like count increased successfully',
      likeCount: comment.likeCount,
    };
  }
}
