import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { CourseSection } from './entities/course-section.entity';
import { CreateCourseSectionDto } from './dto/create-course-section.dto';
import { UpdateCourseSectionDto } from './dto/update-course-section.dto';
import { CreateSectionWithItemsDto } from './dto/create-sections-with-items.dto';
import { CourseSectionItem } from './entities/course-section-item.entity';
import { Lecture } from './entities/lecture.entity';
import { Quiz } from 'src/quiz/entities/quiz.entity';
import { UpdateSectionWithItemsDto } from './dto/update-sections-with-items.dto';
import { Assignment } from 'src/assignment/entities/assignment.entity';

@Injectable()
export class CourseSectionService {
  constructor(
    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) { }

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

  // Refactored
  async createMultipleSectionsWithItems(
    courseId: string,
    sectionsDto: CreateSectionWithItemsDto[],
  ): Promise<CourseSection[]> {
    return this.dataSource.transaction(async (manager) => {
      const allSections: CourseSection[] = [];
      const allItems: CourseSectionItem[] = [];
      const allLectures: Lecture[] = [];
      const quizzesToUpdate: Quiz[] = [];
      const quizIds: string[] = [];

      // 1. Save all sections first (so they have IDs)
      const sectionEntities = sectionsDto.map((dto) =>
        manager.create(CourseSection, {
          ...dto.section,
          course: { id: courseId } as any,
        }),
      );
      const savedSections = await manager.save(sectionEntities);

      // Build quick lookup map by index
      const sectionMap = new Map<number, CourseSection>();
      savedSections.forEach((s, i) => sectionMap.set(i, s));

      // 2. Prepare items now that we have section IDs
      for (const [i, sectionDto] of sectionsDto.entries()) {
        const savedSection = sectionMap.get(i)!;

        for (const itemDto of sectionDto.items ?? []) {
          const item = manager.create(CourseSectionItem, {
            curriculumType: itemDto.curriculumType,
            order: itemDto.order,
            section: { id: savedSection.id } as any, // ✅ only attach ID
          });

          if (itemDto.curriculumType === 'lecture' && itemDto.lecture) {
            const lecture = manager.create(Lecture, itemDto.lecture);
            allLectures.push(lecture);
            (item as any).__lectureDto = lecture;
          }

          if (itemDto.curriculumType === 'quiz' && itemDto.quizId) {
            quizIds.push(itemDto.quizId);
            (item as any).__quizId = itemDto.quizId;
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
        let lectureIndex = 0;
        for (const item of allItems) {
          if ((item as any).__lectureDto) {
            item.lecture = savedLectures[lectureIndex];
            delete (item as any).__lectureDto;
            lectureIndex++;
          }
        }
      }

      // 4. Fetch quizzes in one go
      if (quizIds.length) {
        const quizzes = await manager.find(Quiz, {
          where: { id: In(quizIds) },
        });
        const quizMap = new Map(quizzes.map((q) => [q.id, q]));

        for (const item of allItems) {
          if ((item as any).__quizId) {
            const quiz = quizMap.get((item as any).__quizId);
            if (!quiz) {
              throw new NotFoundException(
                `Quiz with ID ${(item as any).__quizId} not found`,
              );
            }
            if (quiz.standalone) {
              quiz.standalone = false;
              quizzesToUpdate.push(quiz);
            }
            item.quiz = quiz;
            delete (item as any).__quizId;
          }
        }
      }

      // 5. Save items in batch
      if (allItems.length) {
        await manager.save(allItems);
      }

      // 6. Update quizzes (set standalone = false)
      if (quizzesToUpdate.length) {
        await manager.save(quizzesToUpdate);
      }

      // 7. Return sections with relations
      return manager.find(CourseSection, {
        where: { id: In(savedSections.map((s) => s.id)) },
        relations: ['items', 'items.lecture', 'items.quiz', 'items.assignment'],
        order: { order: 'ASC', items: { order: 'ASC' } },
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

  async updateMultipleSectionsWithItems(
    courseId: string,
    sectionsDto: UpdateSectionWithItemsDto[],
  ): Promise<CourseSection[]> {
    return this.dataSource.transaction(async (manager) => {
      const sectionsToCreate: CourseSection[] = [];
      const sectionsToUpdate: CourseSection[] = [];
      const itemsToCreate: CourseSectionItem[] = [];
      const itemsToUpdate: CourseSectionItem[] = [];
      const itemsToDelete: string[] = [];
      const lecturesToCreate: Lecture[] = [];
      const lecturesToUpdate: Lecture[] = [];

      // Load existing sections with all relations (single query)
      const existingSections = await manager.find(CourseSection, {
        where: { course: { id: courseId } },
        relations: ['items', 'items.lecture', 'items.quiz', 'items.assignment'],
      });

      // Build lookup maps for O(1) access
      const existingSectionMap = new Map(
        existingSections.map(s => [s.id, s])
      );
      const existingItemsBySectionMap = new Map(
        existingSections.map(s => [s.id, s.items || []])
      );

      const processedSectionIds = new Set<string>();

      // Step 1: Process sections
      for (const sectionDto of sectionsDto) {
        if (sectionDto.id) {
          const existingSection = existingSectionMap.get(sectionDto.id);
          if (!existingSection) {
            throw new NotFoundException(`Section with ID ${sectionDto.id} not found`);
          }
          if (sectionDto.section) {
            Object.assign(existingSection, sectionDto.section);
          }
          sectionsToUpdate.push(existingSection);
          processedSectionIds.add(sectionDto.id);
        } else {
          const newSection = manager.create(CourseSection, {
            ...sectionDto.section,
            course: { id: courseId } as any,
          });
          sectionsToCreate.push(newSection);
        }
      }

      // Step 2: Save sections in batch
      const [createdSections, updatedSections] = await Promise.all([
        sectionsToCreate.length ? manager.save(sectionsToCreate) : Promise.resolve([]),
        sectionsToUpdate.length ? manager.save(sectionsToUpdate) : Promise.resolve([]),
      ]);

      // Step 3: Map sections for item processing
      const sectionMap = new Map<string, CourseSection>();
      let createdIndex = 0;
      let updatedIndex = 0;

      for (const sectionDto of sectionsDto) {
        if (sectionDto.id) {
          sectionMap.set(sectionDto.id, updatedSections[updatedIndex++]);
        } else {
          sectionMap.set(`temp-${createdIndex}`, createdSections[createdIndex]);
          createdIndex++;
        }
      }

      // Step 4: Process items (no additional queries)
      createdIndex = 0;
      const lectureToItemMap = new Map<Lecture, CourseSectionItem>();

      for (const sectionDto of sectionsDto) {
        const sectionKey = sectionDto.id || `temp-${createdIndex}`;
        const section = sectionMap.get(sectionKey);

        if (!section) {
          console.error(`Section not found for key: ${sectionKey}`);
          continue;
        }

        if (!sectionDto.id) createdIndex++;

        // Use cached items instead of querying
        const existingItems = sectionDto.id
          ? existingItemsBySectionMap.get(sectionDto.id) || []
          : [];

        const existingItemMap = new Map(
          existingItems.map(item => [item.id, item])
        );

        const processedItemIds = new Set<string>();
        const itemsToProcess = sectionDto.items || [];

        for (const itemDto of itemsToProcess) {
          if (itemDto.id) {
            // Update existing item
            const existingItem = existingItemMap.get(itemDto.id);
            if (!existingItem) {
              throw new NotFoundException(`Item with ID ${itemDto.id} not found`);
            }

            Object.assign(existingItem, {
              order: itemDto.order,
              curriculumType: itemDto.curriculumType,
            });

            // Handle lecture updates
            if (itemDto.lecture) {
              if (existingItem.lecture) {
                Object.assign(existingItem.lecture, itemDto.lecture);
                lecturesToUpdate.push(existingItem.lecture);
              } else {
                const newLecture = manager.create(Lecture, itemDto.lecture);
                lecturesToCreate.push(newLecture);
                existingItem.lecture = newLecture;
              }
            }

            // Handle quiz/assignment updates
            if (itemDto.quizId) {
              existingItem.quiz = { id: itemDto.quizId } as Quiz;
            }
            if (itemDto.assignmentId) {
              existingItem.assignment = { id: itemDto.assignmentId } as Assignment;
            }

            itemsToUpdate.push(existingItem);
            processedItemIds.add(itemDto.id);
          } else {
            // Create new item
            const newItem = manager.create(CourseSectionItem, {
              order: itemDto.order,
              curriculumType: itemDto.curriculumType,
              section: section,
            });

            // Handle new lecture
            if (itemDto.lecture) {
              const newLecture = manager.create(Lecture, itemDto.lecture);
              lecturesToCreate.push(newLecture);
              newItem.lecture = newLecture;
              lectureToItemMap.set(newLecture, newItem);
            }

            // Handle quiz/assignment
            if (itemDto.quizId) {
              newItem.quiz = { id: itemDto.quizId } as Quiz;
            }
            if (itemDto.assignmentId) {
              newItem.assignment = { id: itemDto.assignmentId } as Assignment;
            }

            itemsToCreate.push(newItem);
          }
        }

        // Mark items for deletion
        for (const existingItem of existingItems) {
          if (!processedItemIds.has(existingItem.id)) {
            itemsToDelete.push(existingItem.id);
          }
        }
      }

      // Step 5: Delete sections not in request
      const sectionIdsToDelete = existingSections
        .filter(s => !processedSectionIds.has(s.id))
        .map(s => s.id);

      // Step 6: Save all entities in optimal order
      const operations: Promise<any>[] = [];

      // Delete sections first (cascade will handle items)
      if (sectionIdsToDelete.length) {
        operations.push(manager.delete(CourseSection, sectionIdsToDelete));
      }

      // Save new lectures
      if (lecturesToCreate.length) {
        operations.push(
          manager.save(lecturesToCreate).then(savedLectures => {
            // Link saved lectures to items using map
            savedLectures.forEach(savedLecture => {
              const item = lectureToItemMap.get(
                Array.from(lectureToItemMap.keys()).find(
                  l => l.title === savedLecture.title &&
                    l.videoUrl === savedLecture.videoUrl
                )!
              );
              if (item) {
                item.lecture = savedLecture;
              }
            });
          })
        );
      }

      // Update existing lectures
      if (lecturesToUpdate.length) {
        operations.push(manager.save(lecturesToUpdate));
      }

      // Wait for lectures to be saved before saving items
      await Promise.all(operations);

      // Save items in batch
      const itemOperations: Promise<any>[] = [];

      if (itemsToUpdate.length) {
        itemOperations.push(manager.save(itemsToUpdate));
      }
      if (itemsToCreate.length) {
        itemOperations.push(manager.save(itemsToCreate));
      }
      if (itemsToDelete.length) {
        itemOperations.push(manager.delete(CourseSectionItem, itemsToDelete));
      }

      await Promise.all(itemOperations);

      // Step 7: Return final state
      const allSectionIds = [
        ...createdSections.map(s => s.id),
        ...updatedSections.map(s => s.id),
      ];

      return manager.find(CourseSection, {
        where: { id: In(allSectionIds) },
        relations: ['items', 'items.lecture', 'items.quiz', 'items.assignment'],
        order: { order: 'ASC', items: { order: 'ASC' } },
      });
    });
  }
}
