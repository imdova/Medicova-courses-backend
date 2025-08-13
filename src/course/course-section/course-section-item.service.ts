import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CourseSectionItem,
  CurriculumType,
} from './entities/course-section-item.entity';
import { CourseSection } from './entities/course-section.entity';
import { CreateCourseSectionItemDto } from './dto/create-course-section-item.dto';
import { UpdateCourseSectionItemDto } from './dto/update-course-section-item.dto';
import { Lecture } from './entities/lecture.entity';
import { Quiz } from 'src/quiz/entities/quiz.entity';

@Injectable()
export class CourseSectionItemService {
  constructor(
    @InjectRepository(CourseSectionItem)
    private readonly itemRepository: Repository<CourseSectionItem>,

    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,

    @InjectRepository(Lecture)
    private readonly lectureRepository: Repository<Lecture>,

    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
  ) {}

  async addItem(
    sectionId: string,
    dto: CreateCourseSectionItemDto,
  ): Promise<CourseSectionItem> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId, deleted_at: null },
    });
    if (!section) throw new NotFoundException('Section not found');

    let lecture: Lecture | null = null;
    let quiz: Quiz | null = null;

    if (dto.curriculumType === CurriculumType.LECTURE && dto.lecture) {
      lecture = this.lectureRepository.create({ ...dto.lecture });
      await this.lectureRepository.save(lecture);
    }

    if (dto.curriculumType === CurriculumType.QUIZ) {
      if (!dto.quizId) {
        throw new NotFoundException(
          'Quiz ID is required for curriculumType QUIZ',
        );
      }
      quiz = await this.quizRepository.findOne({
        where: { id: dto.quizId, deleted_at: null },
      });
      if (!quiz) throw new NotFoundException('Quiz not found');
    }

    const item = this.itemRepository.create({
      section,
      curriculumType: dto.curriculumType,
      order: dto.order,
      lecture: lecture || null,
      quiz: quiz || null,
    });

    return this.itemRepository.save(item);
  }

  async updateItem(
    itemId: string,
    dto: UpdateCourseSectionItemDto,
  ): Promise<CourseSectionItem> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId, deleted_at: null },
      relations: ['lecture', 'quiz'],
    });
    if (!item) throw new NotFoundException('Item not found');

    const { lecture: lectureDto, quizId, ...itemData } = dto;
    Object.assign(item, itemData);

    // Lecture updates
    if (item.curriculumType === CurriculumType.LECTURE && lectureDto) {
      if (!item.lecture) {
        throw new NotFoundException('Lecture not found for this item');
      }
      Object.assign(item.lecture, lectureDto);
      await this.lectureRepository.save(item.lecture);
    }

    // Quiz reference swap
    if (item.curriculumType === CurriculumType.QUIZ && quizId) {
      const quiz = await this.quizRepository.findOne({
        where: { id: quizId, deleted_at: null },
      });
      if (!quiz) throw new NotFoundException('Quiz not found');
      item.quiz = quiz;
    }

    return this.itemRepository.save(item);
  }

  async removeItem(itemId: string): Promise<void> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId, deleted_at: null },
      relations: ['lecture', 'quiz'],
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.curriculumType === CurriculumType.LECTURE && item.lecture) {
      await this.lectureRepository.remove(item.lecture);
    }

    if (item.curriculumType === CurriculumType.QUIZ && item.quiz) {
      await this.quizRepository.remove(item.quiz);
    }

    // Soft delete the section item
    item.deleted_at = new Date();
    await this.itemRepository.save(item); // This keeps the row, FK won't block
  }
}
