import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Bundle } from './entities/bundle.entity';
import { BundlePricing } from './entities/bundle-pricing.entity';
import { CourseBundle } from './entities/course-bundle.entity';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { Course } from 'src/course/entities/course.entity';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { QueryConfig } from '../common/utils/query-options';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { UserRole } from 'src/user/entities/user.entity';

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
  ) { }

  async createBundle(dto: CreateBundleDto, userId: string, academyId?: string): Promise<Bundle> {
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
      academy: { id: academyId },
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

  async findAll(query: PaginateQuery, userId: string, academyId?: string, role?: UserRole): Promise<Paginated<Bundle>> {
    const qb = this.bundleRepository
      .createQueryBuilder('bundle')
      .leftJoinAndSelect('bundle.pricings', 'pricings')
      .leftJoinAndSelect('bundle.courseBundles', 'courseBundles')
      .leftJoinAndSelect('courseBundles.course', 'course')
      .where('bundle.deleted_at IS NULL');

    if (role === UserRole.ADMIN) {
      // no extra filter
    } else if (role === UserRole.ACADEMY_ADMIN) {
      qb.andWhere('bundle.academy_id = :academyId', { academyId });
    } else {
      qb.andWhere('bundle.created_by = :userId', { userId });
    }

    return paginate(query, qb, BUNDLE_PAGINATION_CONFIG);
  }

  async findOne(id: string, userId: string, academyId?: string, role?: UserRole): Promise<Bundle> {
    const bundle = await this.bundleRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['pricings', 'courseBundles', 'courseBundles.course', 'academy'],
    });
    if (!bundle) throw new NotFoundException('Bundle not found');

    this.checkOwnership(bundle, userId, academyId, role);
    return bundle;
  }

  async updateBundle(id: string, dto: UpdateBundleDto, userId: string, academyId?: string, role?: UserRole): Promise<Bundle> {
    const bundle = await this.bundleRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['pricings', 'courseBundles', 'academy'],
    });
    if (!bundle) throw new NotFoundException('Bundle not found');

    this.checkOwnership(bundle, userId, academyId, role);

    Object.assign(bundle, {
      title: dto.title ?? bundle.title,
      description: dto.description ?? bundle.description,
      thumbnail_url: dto.thumbnail_url ?? bundle.thumbnail_url,
      is_free: dto.is_free ?? bundle.is_free,
      status: dto.status ?? bundle.status,
    });
    await this.bundleRepository.save(bundle);

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

    if (dto.pricings) {
      const dtoCurrencies = dto.pricings.map((p) => p.currency_code);
      for (const pricingDto of dto.pricings) {
        const existing = bundle.pricings.find((p) => p.currency_code === pricingDto.currency_code);
        if (existing) {
          Object.assign(existing, pricingDto);
          await this.pricingRepository.save(existing);
        } else {
          const newPricing = this.pricingRepository.create({ ...pricingDto, bundle });
          await this.pricingRepository.save(newPricing);
        }
      }
      const toRemove = bundle.pricings.filter((p) => !dtoCurrencies.includes(p.currency_code));
      if (toRemove.length) await this.pricingRepository.remove(toRemove);
    }

    return this.findOne(id, userId, academyId, role);
  }

  async remove(id: string, userId: string, academyId?: string, role?: UserRole): Promise<{ message: string }> {
    const bundle = await this.bundleRepository.findOne({
      where: { id, deleted_at: null },
      relations: ['academy'],
    });
    if (!bundle) throw new NotFoundException('Bundle not found');

    this.checkOwnership(bundle, userId, academyId, role);
    await this.bundleRepository.softDelete(id);

    return { message: 'Bundle deleted successfully' };
  }

  private checkOwnership(
    bundle: Bundle,
    userId: string,
    academyId?: string,
    role?: UserRole,
  ) {
    if (role === UserRole.ADMIN) {
      // Super Admin → unrestricted
      return;
    }

    if (role === UserRole.ACADEMY_ADMIN) {
      // Academy admin → must match academy
      if (bundle.academy?.id !== academyId) {
        throw new ForbiddenException(
          'You cannot access bundles outside your academy',
        );
      }
      return;
    }

    // Everyone else (instructors, content creators, etc.) → must be creator
    if (bundle.created_by !== userId) {
      throw new ForbiddenException('You cannot access this bundle');
    }
  }
}
