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
} from '@nestjs/swagger';
import { BundleService } from './bundle.service';
import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
import { Bundle } from './entities/bundle.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/user/entities/user.entity';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Bundles')
@Controller('bundles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class BundleController {
  constructor(private readonly bundleService: BundleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new bundle with courses and pricing' })
  @ApiBody({ type: CreateBundleDto })
  @ApiResponse({
    status: 201,
    description: 'Bundle created successfully',
    type: Bundle,
  })
  async createBundle(@Body() dto: CreateBundleDto, @Req() req) {
    return this.bundleService.createBundle(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all bundles with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of bundles' })
  async findAll(
    @Paginate() query: PaginateQuery,
    @Req() req,
  ): Promise<Paginated<Bundle>> {
    return this.bundleService.findAll(query, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single bundle by ID' })
  @ApiParam({ name: 'id', description: 'UUID of the bundle' })
  @ApiResponse({ status: 200, description: 'Bundle details', type: Bundle })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const bundle = await this.bundleService.findOne(id);
    if (!bundle) throw new NotFoundException('Bundle not found');
    return bundle;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bundle (details, courses, pricing)' })
  @ApiParam({ name: 'id', description: 'UUID of the bundle' })
  @ApiBody({ type: UpdateBundleDto })
  async updateBundle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBundleDto,
  ) {
    return this.bundleService.updateBundle(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a bundle and its relations' })
  @ApiParam({ name: 'id', description: 'UUID of the bundle' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bundleService.remove(id);
  }
}
