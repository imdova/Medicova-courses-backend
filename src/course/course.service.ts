import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Course } from './entities/course.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { QueryConfig } from '../common/utils/query-options';
import { CourseTag } from './entities/course-tags.entity';
import { CoursePricing } from './course-pricing/entities/course-pricing.entity';
import { CourseSectionItem } from './course-section/entities/course-section-item.entity';
import { CourseProgress } from './course-progress/entities/course-progress.entity';
import { CourseStudent } from './entities/course-student.entity';

export const COURSE_PAGINATION_CONFIG: QueryConfig<Course> = {
  sortableColumns: ['created_at', 'name', 'category', 'status'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    name: [FilterOperator.ILIKE], // search by course name (case-insensitive)
    category: [FilterOperator.EQ],
    status: [FilterOperator.EQ],
    isActive: [FilterOperator.EQ],
    createdBy: [FilterOperator.EQ],
  },
  relations: [], // add relations if needed
};

@Injectable()
export class CourseService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseTag)
    private readonly courseTagRepository: Repository<CourseTag>,
    @InjectRepository(CoursePricing)
    private readonly coursePricingRepository: Repository<CoursePricing>,
    @InjectRepository(CourseSectionItem)
    private courseSectionItemRepo: Repository<CourseSectionItem>,
    @InjectRepository(CourseProgress)
    private progressRepo: Repository<CourseProgress>,
  ) {}

  async create(
    createCourseDto: CreateCourseDto,
    userId: string,
  ): Promise<Course> {
    const { tags = [], pricings = [], ...courseData } = createCourseDto;

    if (tags.length > 0) {
      // Step 1: Fetch existing tags in one query
      const existingTags = await this.courseTagRepository.find({
        where: { name: In(tags) },
      });
      const existingNames = existingTags.map((tag) => tag.name);

      // Step 2: Find new tags (case-sensitive here, adjust if needed)
      const newTagNames = tags.filter((name) => !existingNames.includes(name));

      // Step 3: Bulk insert new tags
      if (newTagNames.length > 0) {
        const newTagEntities = newTagNames.map((name) =>
          this.courseTagRepository.create({ name }),
        );
        await this.courseTagRepository.save(newTagEntities);
      }
    }

    // Step 4: Save the course with tags array
    const course = this.courseRepository.create({
      ...courseData,
      createdBy: createCourseDto.createdBy ?? userId,
      tags,
      pricings,
    });

    return this.courseRepository.save(course);
  }

  async getPaginatedCourses(
    query: PaginateQuery,
    userId: string,
  ): Promise<Paginated<Course>> {
    const queryBuilder = this.courseRepository.createQueryBuilder('course');
    queryBuilder
      .andWhere('course.deleted_at IS NULL') // filter out soft-deleted
      .andWhere('course.created_by = :userId', { userId }); // filter by creator

    return paginate(query, queryBuilder, COURSE_PAGINATION_CONFIG);
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['pricings'],
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async update(
    id: string,
    updateData: Partial<CreateCourseDto>,
  ): Promise<Course> {
    const course = await this.findOne(id);

    const { tags, pricings, ...rest } = updateData;

    // Handle tags if provided
    if (tags) {
      // 1. Find existing tags in one query
      const existingTags = await this.courseTagRepository.find({
        where: { name: In(tags) },
      });
      const existingNames = existingTags.map((tag) => tag.name);

      // 2. Identify new tags
      const newTagNames = tags.filter((name) => !existingNames.includes(name));

      // 3. Bulk insert new tags
      if (newTagNames.length > 0) {
        const newTagEntities = newTagNames.map((name) =>
          this.courseTagRepository.create({ name }),
        );
        await this.courseTagRepository.save(newTagEntities);
      }

      // 4. Update course tags array
      course.tags = tags;
    }

    // --- Handle pricings based on currencyType ---
    if (pricings) {
      const existingMap = new Map(
        course.pricings.map((p) => [p.currencyCode, p]),
      );

      for (const p of pricings) {
        const existing = existingMap.get(p.currencyCode);
        if (existing) {
          Object.assign(existing, p);
        } else {
          const newPricing = this.coursePricingRepository.create(p);
          course.pricings.push(newPricing); // attach to course
        }
      }
    }

    // Update other fields
    Object.assign(course, rest);

    return this.courseRepository.save(course);
  }

  async softDelete(id: string): Promise<void> {
    const course = await this.findOne(id);
    course.deleted_at = new Date();
    course.pricings.forEach((p) => (p.deleted_at = new Date()));
    await this.courseRepository.save(course);
  }

  async getAllTags(): Promise<string[]> {
    const tags = await this.courseTagRepository.find({
      order: { name: 'ASC' },
    });
    return tags.map((tag) => tag.name);
  }

  async getAllStudentsProgress(courseId: string) {
    // 1️⃣ Count course items
    const totalItems = await this.courseSectionItemRepo.count({
      where: { section: { course: { id: courseId } } },
    });
    if (totalItems === 0) {
      throw new NotFoundException('No curriculum items found for this course');
    }

    // 2️⃣ Start from CourseStudent (enrollments), then join student + progress
    const summaries = await this.courseRepository.manager
      .getRepository(CourseStudent)
      .createQueryBuilder('courseStudent')
      .leftJoin('courseStudent.student', 'student')
      .leftJoin(
        CourseProgress,
        'progress',
        'progress.course_student_id = courseStudent.id',
      )
      .select('student.id', 'studentId')
      .addSelect('student.email', 'studentEmail')
      .addSelect(
        'COUNT(CASE WHEN progress.completed = true THEN 1 END)',
        'completedItems',
      )
      .where('courseStudent.course = :courseId', { courseId })
      .groupBy('student.id')
      .addGroupBy('student.email')
      .getRawMany();

    // 3️⃣ Map with percentage
    return summaries.map((s) => {
      const completed = Number(s.completedItems) || 0;
      return {
        studentId: s.studentId,
        studentEmail: s.studentEmail,
        totalItems,
        completedItems: completed,
        progressPercentage: (completed / totalItems) * 100,
      };
    });
  }
}
