// coupon/coupon.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Patch,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { Coupon } from './entities/coupon.entity';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Coupons')
@Controller('coupons')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CouponController {
  constructor(private readonly couponService: CouponService) { }

  @Post()
  @RequirePermissions('coupon:create')
  @ApiOperation({ summary: 'Create a new coupon' })
  @ApiCreatedResponse({
    description: 'Coupon created successfully',
    type: Coupon,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiResponse({
    status: 201,
    description: 'Coupon created successfully',
    type: Coupon,
  })
  async create(
    @Body() createCouponDto: CreateCouponDto,
    @Req() req,
  ): Promise<Coupon> {
    return this.couponService.create(createCouponDto, req.user.sub);
  }

  @Get()
  @RequirePermissions('coupon:list')
  @ApiOperation({ summary: 'Retrieve paginated list of coupons' })
  @ApiOkResponse({
    description: 'List of coupons retrieved successfully',
    type: [Coupon],
  })
  @ApiResponse({ status: 200, description: 'List all coupons', type: [Coupon] })
  async findAll(
    @Paginate() query: PaginateQuery,
    @Req() req,
  ): Promise<Paginated<Coupon>> {
    return this.couponService.findAll(query, req.user.sub);
  }

  @Get(':id')
  @RequirePermissions('coupon:get')
  @ApiOperation({ summary: 'Get a coupon by ID' })
  @ApiOkResponse({ description: 'Coupon found', type: Coupon })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  @ApiResponse({
    status: 200,
    description: 'Get a single coupon',
    type: Coupon,
  })
  async findOne(@Param('id') id: string): Promise<Coupon> {
    return this.couponService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('coupon:update')
  @ApiOperation({ summary: 'Update (partially) a coupon by ID' })
  @ApiOkResponse({
    description: 'Coupon updated successfully',
    type: Coupon,
  })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  @ApiBadRequestResponse({ description: 'Invalid update data' })
  @ApiResponse({
    status: 200,
    description: 'Coupon partially updated successfully',
    type: Coupon,
  })
  async patch(
    @Param('id') id: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ): Promise<Coupon> {
    return this.couponService.update(id, updateCouponDto);
  }

  @Delete(':id')
  @RequirePermissions('coupon:delete')
  @ApiOperation({ summary: 'Delete a coupon by ID (soft delete)' })
  @ApiNoContentResponse({ description: 'Coupon deleted successfully' })
  @ApiNotFoundResponse({ description: 'Coupon not found' })
  @ApiResponse({ status: 204, description: 'Coupon deleted successfully' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.couponService.remove(id);
  }
}
