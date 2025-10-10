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

  /**
   * 🔐 Verify user access to the course community
   */
  private async checkCommunityAccess(
    courseId: string,
    userId: string,
    academyId: string,
    role: string,
  ): Promise<void> {
    const course = await this.courseRepo.findOne({
      where: { id: courseId },
      relations: ['academy'],
    });

    if (!course) throw new NotFoundException('Course not found');

    // 🟢 Admin: full access
    if (role === 'admin') return;

    // 🟢 Academy Admin: can access courses within their academy
    if (role === 'academy_admin') {
      if (course.academy?.id !== academyId) {
        throw new ForbiddenException('Access denied: outside your academy.');
      }
      return;
    }

    // 🟢 Instructor / Academy User: must have created the course
    if (['academy_user', 'instructor'].includes(role)) {
      if (course.createdBy !== userId) {
        throw new ForbiddenException('Access denied: not your course.');
      }
      return;
    }

    // 🟢 Student: must be enrolled
    const enrolled = await this.courseRepo.query(
      `
      SELECT 1
      FROM course_student cs
      WHERE cs.course_id = $1 AND cs.student_id = $2
      LIMIT 1
      `,
      [courseId, userId],
    );

    if (enrolled.length === 0) {
      throw new ForbiddenException('Access denied: not enrolled in this course.');
    }
  }

  /**
   * 📝 Create a new comment or reply
   */
  async create(
    courseId: string,
    userId: string,
    academyId: string,
    role: string,
    dto: CreateCourseCommunityDto,
  ) {
    await this.checkCommunityAccess(courseId, userId, academyId, role);

    const [user, course] = await Promise.all([
      this.userRepo.findOne({ where: { id: userId } }),
      this.courseRepo.findOne({ where: { id: courseId } }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!course) throw new NotFoundException('Course not found');

    let parentComment: CourseCommunity | null = null;
    if (dto.parentId) {
      parentComment = await this.communityRepo.findOne({
        where: { id: dto.parentId },
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const newComment = this.communityRepo.create({
      content: dto.content,
      course,
      user,
      parent: parentComment,
    });

    const saved = await this.communityRepo.save(newComment);
    return { message: 'Comment created successfully', data: saved };
  }

  /**
   * 📜 Fetch all comments for a course
   */
  async findAll(
    courseId: string,
    userId: string,
    academyId: string,
    role: string,
  ) {
    await this.checkCommunityAccess(courseId, userId, academyId, role);

    return this.communityRepo.find({
      where: { course: { id: courseId }, parent: null },
      relations: ['user', 'replies', 'replies.user'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * 🔍 Fetch a single comment (and its replies)
   */
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

  /**
   * ✏️ Update a comment (author or admin only)
   */
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

    const isOwner = comment.user.id === userId;
    const isPrivileged = ['admin', 'academy_admin'].includes(role);

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You can only edit your own comments.');
    }

    if (dto.content) comment.content = dto.content;

    const updated = await this.communityRepo.save(comment);
    return { message: 'Comment updated successfully', data: updated };
  }

  /**
   * ❌ Delete a comment (author or admin only)
   */
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

    const isOwner = comment.user.id === userId;
    const isPrivileged = ['admin', 'academy_admin'].includes(role);

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException('You can only delete your own comments.');
    }

    await this.communityRepo.remove(comment);
    return { message: 'Comment deleted successfully' };
  }

  /**
   * 👍 Increase like count for a comment
   */
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

    comment.likeCount = (comment.likeCount || 0) + 1;
    await this.communityRepo.save(comment);

    return {
      message: 'Like count increased successfully',
      likeCount: comment.likeCount,
    };
  }
}
