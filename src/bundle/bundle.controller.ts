import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  ParseUUIDPipe,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { BundleService } from './bundle.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { Bundle } from './entities/bundle.entity';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Bundles')
@Controller('bundles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class BundleController {
  constructor(private readonly bundleService: BundleService) { }

  @Post()
  @RequirePermissions('bundle:create')
  @ApiOperation({ summary: 'Create a new bundle with courses and pricing' })
  @ApiBody({ type: CreateBundleDto })
  @ApiResponse({
    status: 201,
    description: 'Bundle created successfully',
    type: Bundle,
  })
  async createBundle(@Body() dto: CreateBundleDto, @Req() req) {
    return this.bundleService.createBundle(
      dto,
      req.user.sub,
      req.user.academyId,
    );
  }

  @Get()
  @RequirePermissions('bundle:list')
  @ApiOperation({ summary: 'Get all bundles with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of bundles' })
  @ApiQuery({
    name: 'filter.title',
    required: false,
    description:
      'Search by bundle title (ILIKE). Example value: `$ilike:starter`',
    example: '$ilike:starter',
  })
  @ApiQuery({
    name: 'filter.status',
    required: false,
    description: 'Filter by bundle status (EQ). Example value: `$eq:published`',
    example: '$eq:published',
  })
  @ApiQuery({
    name: 'filter.is_free',
    required: false,
    description: 'Filter by free/paid flag (EQ). Example value: `$eq:true`',
    example: '$eq:true',
  })
  @ApiQuery({
    name: 'filter.active',
    required: false,
    description: 'Filter by active flag (EQ). Example value: `$eq:true`',
    example: '$eq:true',
  })
  @ApiQuery({
    name: 'filter.pricings.sale_price',
    required: false,
    description:
      'Filter by sale price (GTE/LTE). Example values: `$gte:100`, `$lte:500`',
    example: '$gte:100',
  })
  @ApiQuery({
    name: 'filter.pricings.currency_code',
    required: false,
    description: 'Filter by currency code (EQ). Example value: `$eq:USD`',
    example: '$eq:USD',
  })
  async findAll(
    @Paginate() query: PaginateQuery,
    @Req() req,
  ): Promise<Paginated<Bundle>> {
    return this.bundleService.findAll(
      query,
      req.user.sub,
      req.user.academyId,
      req.user.role,
    );
  }

  @Get(':id')
  @RequirePermissions('bundle:get')
  @ApiOperation({ summary: 'Get a single bundle by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the bundle' })
  @ApiResponse({ status: 200, description: 'Bundle details', type: Bundle })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    const bundle = await this.bundleService.findOne(
      id,
      req.user.sub,
      req.user.academyId,
      req.user.role,
    );
    if (!bundle) throw new NotFoundException('Bundle not found');
    return bundle;
  }

  @Patch(':id')
  @RequirePermissions('bundle:update')
  @ApiOperation({ summary: 'Update a bundle (details, courses, pricing)' })
  @ApiParam({ name: 'id', description: 'UUID of the bundle' })
  @ApiBody({ type: UpdateBundleDto })
  async updateBundle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBundleDto,
    @Req() req,
  ) {
    return this.bundleService.updateBundle(
      id,
      dto,
      req.user.sub,
      req.user.academyId,
      req.user.role,
    );
  }

  @Delete(':id')
  @RequirePermissions('bundle:delete')
  @ApiOperation({ summary: 'Soft delete a bundle and its relations' })
  @ApiParam({ name: 'id', description: 'UUID of the bundle' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.bundleService.remove(
      id,
      req.user.sub,
      req.user.academyId,
      req.user.role,
    );
  }
}
