import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CourseSection } from './entities/course-section.entity';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';
import { UpdateCourseSectionDto } from './dto/update-course-section.dto';
import { CreateSectionWithItemsDto } from './dto/create-sections-with-items.dto';
import { CourseSectionItem } from './entities/course-section-item.entity';
import { Lecture } from './entities/lecture.entity';

@Injectable()
export class CourseSectionService {
  constructor(
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
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

  async createMultipleSectionsWithItems(
    courseId: string,
    sectionsDto: CreateSectionWithItemsDto[],
  ): Promise<CourseSection[]> {
    return this.dataSource.transaction(async (manager) => {
      const savedSections: CourseSection[] = [];
      const allItems: CourseSectionItem[] = [];
      const allLectures: Lecture[] = [];

      // 1. Create sections
      for (const sectionDto of sectionsDto) {
        const section = manager.create(CourseSection, {
          ...sectionDto.section,
          course: { id: courseId } as any,
        });
        const savedSection = await manager.save(section);
        savedSections.push(savedSection);

        // 2. Prepare items for this section
        for (const itemDto of sectionDto.items ?? []) {
          const item = manager.create(CourseSectionItem, {
            curriculumType: itemDto.curriculumType,
            order: itemDto.order,
            section: savedSection,
          });

          if (itemDto.curriculumType === 'lecture' && itemDto.lecture) {
            const lecture = manager.create(Lecture, itemDto.lecture);
            allLectures.push(lecture);
            // Temporarily store relation, will attach after lecture save
            (item as any).__lectureDto = lecture;
          }

          if (itemDto.curriculumType === 'quiz' && itemDto.quizId) {
            item.quiz = { id: itemDto.quizId } as any;
          }

          allItems.push(item);
        }
      }

      // 3. Save lectures in batch
      if (allLectures.length) {
        const savedLectures = await manager.save(allLectures);

        // Attach saved lecture entities back to items
        let lectureIndex = 0;
        for (const item of allItems) {
          if ((item as any).__lectureDto) {
            item.lecture = savedLectures[lectureIndex];
            delete (item as any).__lectureDto;
            lectureIndex++;
          }
        }
      }

      // 4. Save items in batch
      if (allItems.length) {
        await manager.save(allItems);
      }

      // 5. Fetch all sections with relations in one query
      return manager.find(CourseSection, {
        where: { id: In(savedSections.map((s) => s.id)) },
        relations: ['items', 'items.lecture', 'items.quiz'],
        order: {
          order: 'ASC',
          items: { order: 'ASC' },
        },
      });
    });
  }

  async getSectionsByCourse(courseId: string): Promise<CourseSection[]> {
    const sections = await this.sectionRepository
      .createQueryBuilder('section')
      .leftJoinAndSelect('section.items', 'item')
      .leftJoinAndSelect('item.lecture', 'lecture')
      .leftJoinAndSelect('item.quiz', 'quiz')
      .leftJoinAndSelect('quiz.quizQuestions', 'quizQuestion')
      .leftJoinAndSelect('quizQuestion.question', 'question')
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

  async removeSection(sectionId: string): Promise<void> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId, deleted_at: null },
    });
    if (!section) throw new NotFoundException('Section not found');
    await this.sectionRepository.remove(section);
  }
}
