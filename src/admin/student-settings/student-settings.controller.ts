import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { StudentSettingsService } from './student-settings.service';
import { CreateStudentSettingDto } from './dto/create-student-setting.dto';
import { UpdateStudentSettingDto } from './dto/update-student-setting.dto';
import { StudentSetting, SettingType } from './entities/student-setting.entity';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';

@ApiTags('Student Settings Management (Admin)')
@ApiBearerAuth('access_token')
@Controller('student-settings')
export class StudentSettingsController {
  constructor(private readonly studentSettingsService: StudentSettingsService) { }

  // -----------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------
  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('student-settings:create')
  @ApiOperation({ summary: 'Create a new student setting' })
  @ApiResponse({
    status: 201,
    description: 'Student setting created successfully.',
    type: StudentSetting
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or duplicate value/displayName.'
  })
  async create(@Body() createStudentSettingDto: CreateStudentSettingDto): Promise<StudentSetting> {
    return this.studentSettingsService.create(createStudentSettingDto);
  }

  // -----------------------------------------------------------------
  // LIST (PAGINATED)
  // -----------------------------------------------------------------
  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('student-settings:list')
  @ApiOperation({ summary: 'Get a paginated list of all student settings with filtering' })
  @ApiResponse({
    status: 200,
    description: 'List of student settings retrieved successfully.'
  })
  @ApiQuery({
    name: 'filter.type',
    required: false,
    enum: SettingType,
    description: `Filter by setting type. Options: ${Object.values(SettingType).join(', ')}`,
    example: SettingType.DEGREE,
  })
  @ApiQuery({
    name: 'filter.isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'filter.parentId',
    required: false,
    type: String,
    description: 'Filter by parent ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Global search term applied to displayName and value fields.',
    example: 'bachelor',
  })
  async findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<StudentSetting>> {
    return this.studentSettingsService.findAll(query);
  }

  // -----------------------------------------------------------------
  // READ ONE
  // -----------------------------------------------------------------
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('student-settings:read')
  @ApiOperation({ summary: 'Get a single student setting by ID' })
  @ApiResponse({
    status: 200,
    description: 'Student setting retrieved successfully.',
    type: StudentSetting
  })
  @ApiResponse({
    status: 404,
    description: 'Student setting not found.'
  })
  async findOne(@Param('id') id: string): Promise<StudentSetting> {
    return this.studentSettingsService.findOne(id);
  }

  // -----------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('student-settings:update')
  @ApiOperation({ summary: 'Update an existing student setting by ID' })
  @ApiResponse({
    status: 200,
    description: 'Student setting updated successfully.',
    type: StudentSetting
  })
  @ApiResponse({
    status: 404,
    description: 'Student setting not found.'
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data.'
  })
  async update(
    @Param('id') id: string,
    @Body() updateStudentSettingDto: UpdateStudentSettingDto
  ): Promise<StudentSetting> {
    return this.studentSettingsService.update(id, updateStudentSettingDto);
  }

  // -----------------------------------------------------------------
  // DELETE (Soft Delete)
  // -----------------------------------------------------------------
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('student-settings:delete')
  @ApiOperation({ summary: 'Soft delete a student setting by ID' })
  @ApiResponse({
    status: 200,
    description: 'Student setting deleted successfully.'
  })
  @ApiResponse({
    status: 404,
    description: 'Student setting not found.'
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.studentSettingsService.remove(id);
  }
}