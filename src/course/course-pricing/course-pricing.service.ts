import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoursePricing } from './entities/course-pricing.entity';
import { CreateCoursePricingDto } from './dto/create-course-pricing.dto';
import { UpdateCoursePricingDto } from './dto/update-course-pricing.dto';
import { Course } from '../entities/course.entity';

@Injectable()
export class CoursePricingService {
  constructor(
    @InjectRepository(CoursePricing)
    private readonly pricingRepo: Repository<CoursePricing>,
    @InjectRepository(Course)
    private readonly courseRepo: Repository<Course>,
  ) {}

  async createPricing(
    courseId: string,
    dto: CreateCoursePricingDto,
  ): Promise<CoursePricing> {
    const course = await this.courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException(`Course with id ${courseId} not found`);
    }
    const pricing = this.pricingRepo.create({
      ...dto,
      course: { id: courseId },
    });
    return this.pricingRepo.save(pricing);
  }

  async getPricingByCourse(courseId: string): Promise<CoursePricing[]> {
    return this.pricingRepo.find({
      where: { course: { id: courseId }, isActive: true },
    });
  }

  async updatePricing(
    id: string,
    dto: UpdateCoursePricingDto,
  ): Promise<CoursePricing> {
    const pricing = await this.pricingRepo.findOneBy({ id });
    if (!pricing) throw new NotFoundException('Pricing not found');
    Object.assign(pricing, dto);
    return this.pricingRepo.save(pricing);
  }

  async softDeletePricing(id: string): Promise<void> {
    const pricing = await this.pricingRepo.findOneBy({ id });
    if (!pricing) throw new NotFoundException('Pricing not found');
    pricing.isActive = false;
    await this.pricingRepo.save(pricing);
  }
}
