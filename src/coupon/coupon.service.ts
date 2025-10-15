import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { QueryConfig } from 'src/common/utils/query-options';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';

export const COUPON_PAGINATION_CONFIG: QueryConfig<Coupon> = {
  sortableColumns: ['created_at', 'updated_at', 'name', 'code', 'status'],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    name: [FilterOperator.ILIKE], // search by coupon name
    code: [FilterOperator.ILIKE], // search by code
    status: [FilterOperator.EQ], // filter by status
    offer_type: [FilterOperator.EQ], // filter by offer type
  },
};

@Injectable()
export class CouponService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepository: Repository<Coupon>,
  ) { }

  async create(createCouponDto: CreateCouponDto, userId: string): Promise<Coupon> {
    try {
      const coupon = this.couponRepository.create({
        ...createCouponDto,
        created_by: userId,
      });

      return await this.couponRepository.save(coupon);
    } catch (err: any) {
      // Check for Postgres duplicate error
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';
        if (detail.includes('(code)')) {
          throw new HttpException(
            `Coupon code "${createCouponDto.code}" already exists.`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Generic duplicate field fallback
        throw new HttpException(
          `Duplicate entry detected. Please use unique values.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Unknown error
      console.error('Coupon creation failed:', err);
      throw new HttpException(
        'An unexpected error occurred while creating the coupon.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    query: PaginateQuery,
    userId: string,
  ): Promise<Paginated<Coupon>> {
    const qb = this.couponRepository
      .createQueryBuilder('coupon')
      .where('coupon.created_by = :userId', { userId });

    return paginate(query, qb, COUPON_PAGINATION_CONFIG);
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon with ID ${id} not found`);
    return coupon;
  }

  async update(id: string, updateCouponDto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);
    Object.assign(coupon, updateCouponDto);

    try {
      return await this.couponRepository.save(coupon);
    } catch (err: any) {
      if (err?.code === '23505') {
        const detail = err?.detail ?? '';

        if (detail.includes('(code)')) {
          throw new HttpException(
            `Coupon code "${updateCouponDto.code}" already exists.`,
            HttpStatus.BAD_REQUEST,
          );
        }

        // Generic duplicate constraint fallback
        throw new HttpException(
          `Duplicate entry detected. Please use unique values.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      console.error('Coupon update failed:', err);
      throw new HttpException(
        'An unexpected error occurred while updating the coupon.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.findOne(id);
    await this.couponRepository.softRemove(coupon);
  }
}
