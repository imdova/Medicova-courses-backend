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

@Injectable()
export class CourseSectionItemService {
  constructor(
    @InjectRepository(CourseSectionItem)
    private readonly itemRepository: Repository<CourseSectionItem>,

    @InjectRepository(CourseSection)
    private readonly sectionRepository: Repository<CourseSection>,

    @InjectRepository(Lecture)
    private readonly lectureRepository: Repository<Lecture>,
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

    if (dto.curriculumType === CurriculumType.LECTURE && dto.lecture) {
      lecture = this.lectureRepository.create({
        ...dto.lecture,
      });
      await this.lectureRepository.save(lecture);
    }

    const item = this.itemRepository.create({
      section,
      curriculumType: dto.curriculumType,
      order: dto.order,
      lecture: lecture || null,
    });

    return this.itemRepository.save(item);
  }

  async updateItem(
    itemId: string,
    dto: UpdateCourseSectionItemDto,
  ): Promise<CourseSectionItem> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId, deleted_at: null },
      relations: ['lecture'],
    });
    if (!item) throw new NotFoundException('Item not found');

    // Update only top-level fields, excluding 'lecture'
    const { lecture: lectureDto, ...itemData } = dto;
    Object.assign(item, itemData);

    // If it's a lecture and lecture data is provided, update it
    if (item.curriculumType === CurriculumType.LECTURE && lectureDto) {
      if (!item.lecture) {
        throw new NotFoundException('Lecture not found for this item');
      }

      Object.assign(item.lecture, lectureDto);
      await this.lectureRepository.save(item.lecture);
    }

    return this.itemRepository.save(item);
  }

  async removeItem(itemId: string): Promise<void> {
    const item = await this.itemRepository.findOne({
      where: { id: itemId, deleted_at: null },
      relations: ['lecture'],
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // If lecture exists, delete it from lectures table
    if (item.curriculumType === CurriculumType.LECTURE && item.lecture) {
      await this.lectureRepository.remove(item.lecture);
    }

    // Soft delete the section item
    item.deleted_at = new Date();
    await this.itemRepository.save(item); // This keeps the row, FK won't block
  }
}
