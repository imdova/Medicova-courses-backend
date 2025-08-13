import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseSection } from './entities/course-section.entity';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';
import { UpdateCourseSectionDto } from './dto/update-course-section.dto';

@Injectable()
export class CourseSectionService {
  constructor(
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
  ) {}

  async createSection(
    courseId: string,
    dto: CreateCourseSectionDto,
  ): Promise<CourseSection> {
    const section = this.sectionRepository.create({
      ...dto,
      course: { id: courseId } as any,
    });
    return this.sectionRepository.save(section);
  }

  async getSectionsByCourse(courseId: string): Promise<CourseSection[]> {
    const sections = await this.sectionRepository
      .createQueryBuilder('section')
      .leftJoinAndSelect('section.items', 'item')
      .leftJoinAndSelect('item.lecture', 'lecture')
      .leftJoinAndSelect('item.quiz', 'quiz')
      .where('section.course_id = :courseId', { courseId })
      .andWhere('section.deleted_at IS NULL')
      .orderBy('section.order', 'ASC')
      .addOrderBy('item.order', 'ASC')
      .getMany();

    return sections;
  }

  async updateSection(
    sectionId: string,
    dto: UpdateCourseSectionDto,
  ): Promise<CourseSection> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId, deleted_at: null },
    });
    if (!section) throw new NotFoundException('Section not found');
    Object.assign(section, dto);
    return this.sectionRepository.save(section);
  }

  async softDeleteSection(sectionId: string): Promise<void> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId, deleted_at: null },
    });
    if (!section) throw new NotFoundException('Section not found');
    section.deleted_at = new Date();
    await this.sectionRepository.save(section);
  }
}
