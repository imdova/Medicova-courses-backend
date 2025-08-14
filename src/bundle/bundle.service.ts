import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Bundle } from './entities/bundle.entity';
import { BundlePricing } from './entities/bundle-pricing.entity';
import { CourseBundle } from './entities/course-bundle.entity';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { Course } from 'src/course/entities/course.entity';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { QueryConfig } from 'src/common/utils/query-options';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';

export const BUNDLE_PAGINATION_CONFIG: QueryConfig<Bundle> = {
  sortableColumns: ['created_at', 'title', 'status'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    title: [FilterOperator.ILIKE], // search by title
    status: [FilterOperator.EQ],
    is_free: [FilterOperator.EQ],
    active: [FilterOperator.EQ],
  },
  relations: ['pricings', 'courseBundles', 'courseBundles.course'],
};

@Injectable()
export class BundleService {
  constructor(
    @InjectRepository(Bundle)
    private readonly bundleRepository: Repository<Bundle>,

    @InjectRepository(BundlePricing)
    private readonly pricingRepository: Repository<BundlePricing>,

    @InjectRepository(CourseBundle)
    private readonly courseBundleRepository: Repository<CourseBundle>,

    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
  ) {}

  async createBundle(dto: CreateBundleDto, userId: string): Promise<Bundle> {
    // 1️⃣ Validate all courses exist
    const courses = await this.courseRepository.find({
      where: { id: In(dto.courseIds), deleted_at: null },
    });

    if (courses.length !== dto.courseIds.length) {
      throw new NotFoundException('One or more courses not found');
    }

    // 2️⃣ Create bundle entity
    const bundle = this.bundleRepository.create({
      title: dto.title,
      description: dto.description,
      thumbnail_url: dto.thumbnail_url,
      is_free: dto.is_free,
      status: dto.status,
      created_by: userId, // Replace with actual user from auth
      active: true,
    });

    const savedBundle = await this.bundleRepository.save(bundle);

    // 3️⃣ Create pricing records
    const pricings = dto.pricings.map((pricing) =>
      this.pricingRepository.create({
        ...pricing,
        bundle: savedBundle,
      }),
    );
    await this.pricingRepository.save(pricings);

    // 4️⃣ Create course-bundle relations
    const courseBundles = courses.map((course) =>
      this.courseBundleRepository.create({
        bundle: savedBundle,
        course,
      }),
    );
    await this.courseBundleRepository.save(courseBundles);

    // 5️⃣ Return bundle with relations
    return this.bundleRepository.findOne({
      where: { id: savedBundle.id },
      relations: ['pricings', 'courseBundles', 'courseBundles.course'],
    });
  }

  async findAll(query: PaginateQuery): Promise<Paginated<Bundle>> {
    const queryBuilder = this.bundleRepository
      .createQueryBuilder('bundle')
      .leftJoinAndSelect('bundle.pricings', 'pricings')
      .leftJoinAndSelect('bundle.courseBundles', 'courseBundles')
      .leftJoinAndSelect('courseBundles.course', 'course')
      .where('bundle.deleted_at IS NULL');

    return paginate(query, queryBuilder, BUNDLE_PAGINATION_CONFIG);
  }

  async findOne(id: string): Promise<Bundle | null> {
    return this.bundleRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['pricings', 'courseBundles', 'courseBundles.course'],
    });
  }

  async updateBundle(id: string, dto: UpdateBundleDto): Promise<Bundle> {
    const bundle = await this.bundleRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['pricings', 'courseBundles'],
    });
    if (!bundle) throw new NotFoundException('Bundle not found');

    // Update main bundle details
    Object.assign(bundle, {
      title: dto.title ?? bundle.title,
      description: dto.description ?? bundle.description,
      thumbnail_url: dto.thumbnail_url ?? bundle.thumbnail_url,
      is_free: dto.is_free ?? bundle.is_free,
      status: dto.status ?? bundle.status,
    });
    await this.bundleRepository.save(bundle);

    // Update courses if provided
    if (dto.courseIds) {
      await this.courseBundleRepository.delete({ bundle: { id } });
      const courses = await this.courseRepository.find({
        where: { id: In(dto.courseIds), deleted_at: null },
      });
      const courseBundles = courses.map((course) =>
        this.courseBundleRepository.create({ bundle, course }),
      );
      await this.courseBundleRepository.save(courseBundles);
    }

    // Update pricings if provided
    if (dto.pricings) {
      for (const pricingDto of dto.pricings) {
        // Check if pricing already exists for this currency
        const existingPricing = bundle.pricings.find(
          (p) => p.currency_code === pricingDto.currency_code,
        );

        if (existingPricing) {
          // Update existing
          Object.assign(existingPricing, pricingDto);
          await this.pricingRepository.save(existingPricing);
        } else {
          // Create new
          const newPricing = this.pricingRepository.create({
            ...pricingDto,
            bundle,
          });
          await this.pricingRepository.save(newPricing);
        }
      }

      // Optional: remove pricings for currencies not in dto.pricings
      const dtoCurrencies = dto.pricings.map((p) => p.currency_code);
      const pricingsToRemove = bundle.pricings.filter(
        (p) => !dtoCurrencies.includes(p.currency_code),
      );
      if (pricingsToRemove.length > 0) {
        await this.pricingRepository.remove(pricingsToRemove);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const bundle = await this.bundleRepository.findOne({
      where: { id, deleted_at: null },
    });
    if (!bundle) throw new NotFoundException('Bundle not found');

    await this.bundleRepository.softDelete(id);
    return { message: 'Bundle deleted successfully' };
  }
}
