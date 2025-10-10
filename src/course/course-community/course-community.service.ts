import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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

  // 🔹 CREATE COMMENT OR REPLY
  async create(courseId: string, userId: string, dto: CreateCourseCommunityDto) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

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

  // 🔹 GET ALL COMMENTS FOR A COURSE
  async findAll(courseId: string) {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const comments = await this.communityRepo.find({
      where: { course: { id: courseId }, parent: null },
      relations: ['user', 'replies', 'replies.user'],
      order: { created_at: 'DESC' },
    });

    return comments;
  }

  // 🔹 GET ONE COMMENT
  async findOne(courseId: string, id: string) {
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
    dto: UpdateCourseCommunityDto,
  ) {
    const comment = await this.communityRepo.findOne({
      where: { id, course: { id: courseId } },
      relations: ['user'],
    });

    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.user.id !== userId)
      throw new ForbiddenException('You can only edit your own comments');

    comment.content = dto.content ?? comment.content;
    const updated = await this.communityRepo.save(comment);

    return { message: 'Comment updated successfully', data: updated };
  }

  // 🔹 DELETE COMMENT
  async remove(courseId: string, id: string, userId: string) {
    const comment = await this.communityRepo.findOne({
      where: { id, course: { id: courseId } },
      relations: ['user'],
    });

    if (!comment) throw new NotFoundException('Comment not found');

    // Allow owner or admin/instructor (extend this if you have roles)
    if (comment.user.id !== userId)
      throw new ForbiddenException('You can only delete your own comments');

    await this.communityRepo.remove(comment);
    return { message: 'Comment deleted successfully' };
  }

  // 🔹 INCREASE LIKE COUNT
  async likeComment(courseId: string, commentId: string) {
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
