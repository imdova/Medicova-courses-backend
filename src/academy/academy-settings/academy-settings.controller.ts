import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { AcademySettingsService } from './academy-settings.service';
import { CreateAcademySettingDto } from './dto/create-academy-setting.dto';
import { UpdateAcademySettingDto } from './dto/update-academy-setting.dto';
import { AcademySetting, SettingType } from './entities/academy-setting.entity';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';

@ApiTags('Academy Settings Management (Admin)')
@ApiBearerAuth('access_token')
@Controller('academy-settings')
export class AcademySettingsController {
  constructor(private readonly academySettingsService: AcademySettingsService) { }

  // -----------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------
  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('academy-settings:create')
  @ApiOperation({ summary: 'Create a new academy setting' })
  @ApiResponse({
    status: 201,
    description: 'Academy setting created successfully.',
    type: AcademySetting
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate value/displayName.'
  })
  async create(@Body() createAcademySettingDto: CreateAcademySettingDto): Promise<AcademySetting> {
    return this.academySettingsService.create(createAcademySettingDto);
  }

  // -----------------------------------------------------------------
  // LIST (PAGINATED)
  // -----------------------------------------------------------------
  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('academy-settings:list')
  @ApiOperation({ summary: 'Get a paginated list of all academy settings with filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of academy settings retrieved successfully.'
  })
  @ApiQuery({
    name: 'filter.type',
    required: false,
    enum: SettingType,
    description: `Filter by setting type. Options: ${Object.values(SettingType).join(', ')}`,
    example: SettingType.NATIONALITY,
  })
  @ApiQuery({
    name: 'filter.isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Global search term applied to displayName and value fields.',
    example: 'egyptian',
  })
  async findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<AcademySetting>> {
    return this.academySettingsService.findAll(query);
  }

  // -----------------------------------------------------------------
  // READ ONE
  // -----------------------------------------------------------------
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('academy-settings:read')
  @ApiOperation({ summary: 'Get a single academy setting by ID' })
  @ApiResponse({
    status: 200,
    description: 'Academy setting retrieved successfully.',
    type: AcademySetting
  })
  @ApiResponse({
    status: 404,
    description: 'Academy setting not found.'
  })
  async findOne(@Param('id') id: string): Promise<AcademySetting> {
    return this.academySettingsService.findOne(id);
  }

  // -----------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('academy-settings:update')
  @ApiOperation({ summary: 'Update an existing academy setting by ID' })
  @ApiResponse({
    status: 200,
    description: 'Academy setting updated successfully.',
    type: AcademySetting
  })
  @ApiResponse({
    status: 404,
    description: 'Academy setting not found.'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.'
  })
  async update(
    @Param('id') id: string,
    @Body() updateAcademySettingDto: UpdateAcademySettingDto
  ): Promise<AcademySetting> {
    return this.academySettingsService.update(id, updateAcademySettingDto);
  }

  // -----------------------------------------------------------------
  // DELETE (Soft Delete)
  // -----------------------------------------------------------------
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('academy-settings:delete')
  @ApiOperation({ summary: 'Soft delete an academy setting by ID' })
  @ApiResponse({
    status: 200,
    description: 'Academy setting deleted successfully.'
  })
  @ApiResponse({
    status: 404,
    description: 'Academy setting not found.'
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.academySettingsService.remove(id);
  }
}