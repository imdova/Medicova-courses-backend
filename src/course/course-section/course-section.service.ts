import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { CourseSection } from './entities/course-section.entity';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';
import { UpdateCourseSectionDto } from './dto/update-course-section.dto';
import { CreateSectionWithItemsDto } from './dto/create-sections-with-items.dto';
import { CourseSectionItem } from './entities/course-section-item.entity';
import { Lecture } from './entities/lecture.entity';
import { Quiz } from 'src/quiz/entities/quiz.entity';

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

    // Reorder sections
    await this.reorderSections(courseId, section);

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
      const quizzesToUpdate: Quiz[] = [];

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
            // fetch quiz and update standalone flag
            const quiz = await manager.findOne(Quiz, {
              where: { id: itemDto.quizId },
            });
            if (!quiz) {
              throw new NotFoundException(
                `Quiz with ID ${itemDto.quizId} not found`,
              );
            }
            if (quiz.standalone) {
              quiz.standalone = false;
              quizzesToUpdate.push(quiz);
            }
            item.quiz = quiz;
          }

          if (itemDto.curriculumType === 'assignment' && itemDto.assignmentId) {
            item.assignment = { id: itemDto.assignmentId } as any;
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

      // 5. Update quizzes (mark them as non-standalone)
      if (quizzesToUpdate.length) {
        await manager.save(quizzesToUpdate);
      }

      // 6. Fetch all sections with relations in one query
      return manager.find(CourseSection, {
        where: { id: In(savedSections.map((s) => s.id)) },
        relations: ['items', 'items.lecture', 'items.quiz', 'items.assignment'],
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
      .leftJoinAndSelect('item.assignment', 'assignment')
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
      relations: ['course'],
    });
    if (!section) throw new NotFoundException('Section not found');
    if (!section.course) throw new NotFoundException('Course not found');

    const oldOrder = section.order;
    Object.assign(section, dto);

    // Update order if provided
    if (oldOrder !== undefined && oldOrder !== null) {
      await this.reorderSections(section.course.id, section);
    }

    return this.sectionRepository.save(section);
  }

  async removeSection(sectionId: string): Promise<void> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId, deleted_at: null },
    });
    if (!section) throw new NotFoundException('Section not found');
    await this.sectionRepository.remove(section);
  }

  private async reorderSections(
    courseId: string,
    section: CourseSection,
  ): Promise<CourseSection> {
    // Fetch all sections for the course, ordered
    const sections = await this.sectionRepository.find({
      where: { course: { id: courseId }, deleted_at: null },
      order: { order: 'ASC' },
    });

    // If no order provided, set to last
    if (section.order === undefined || section.order === null) {
      section.order = (sections[sections.length - 1]?.order ?? 0) + 1;
      return section;
    }

    // Remove current section if already exists
    const filtered = sections.filter((s) => s.id !== section.id);

    // Insert section at desired position (order - 1)
    filtered.splice(section.order - 1, 0, section);

    // Reassign sequential orders starting from 1
    const reordered = filtered.map((s, index) => {
      s.order = index + 1;
      return s;
    });

    // Save all except the one being created/updated
    await this.sectionRepository.save(
      reordered.filter((s) => s.id !== section.id),
    );

    return reordered.find((s) => s.id === section.id) ?? section;
  }
}
