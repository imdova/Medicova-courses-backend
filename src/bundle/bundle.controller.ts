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
  Query,
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
export class BundleController {
  constructor(private readonly bundleService: BundleService) { }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
    name: 'filter.slug',
    required: false,
    description:
      'Search by bundle slug (ILIKE). Example value: `$ilike:starter`',
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

  @Get('bundles/courses')
  @ApiOperation({
    summary: 'Get all bundles that include any of the specified courses (Public endpoint)'
  })
  @ApiQuery({
    name: 'courseIds',
    required: true,
    type: String,
    description: 'Comma-separated list of course UUIDs'
  })
  @ApiResponse({
    status: 200,
    description: 'List of bundles containing any of the specified courses',
    schema: {
      example: [
        {
          "id": "0acc0660-c955-4113-a261-f24bbd7d33f5",
          "title": "Web Development Bundle",
          "slug": "web-dev-bundle",
          "description": "<p>Complete web development courses bundle</p>",
          "thumbnail_url": "https://example.com/images/bundle-thumb.jpg",
          "is_free": false,
          "status": "published",
          "active": true,
          "number_of_purchases": 0,
          "revenue": 0,
          "pricings": [
            {
              "id": "a6f72689-44a0-4b99-bd8b-4954862de9e7",
              "currency_code": "EGP",
              "regular_price": 1585,
              "sale_price": 951,
              "discount_amount": 40,
              "discount_enabled": true,
              "is_active": true
            }
          ],
          "courseBundles": [
            {
              "id": "c51dd602-4313-494d-8278-a6cbe37c221b",
              "course": {
                // full course data for ALL courses in the bundle
              }
            },
            {
              "id": "d62ee713-5244-594e-9379-a7d4cc8d332c",
              "course": {
                // another course in the same bundle
              }
            }
          ]
        }
      ]
    }
  })
  async getBundlesByCourses(
    @Query('courseIds') courseIds: string
  ): Promise<Bundle[]> {
    return this.bundleService.findBundlesByCourses(courseIds);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
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
