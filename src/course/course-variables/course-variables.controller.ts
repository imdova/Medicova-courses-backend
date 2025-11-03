import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CourseVariablesService } from './course-variables.service';
import { CreateCourseVariableDto } from './dto/create-course-variable.dto';
import { UpdateCourseVariableDto } from './dto/update-course-variable.dto';
import { PermissionsGuard } from '../../auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { CourseVariable } from './entities/course-variable.entity';
import {
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';

@ApiTags('Course Variables') // variables the controller for grouping in Swagger UI
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('course-variables')
export class CourseVariablesController {
  constructor(private readonly coursevariablesService: CourseVariablesService) { }

  // --- POST /course-variables ---
  @Post()
  @RequirePermissions('course-variables:create')
  @ApiOperation({ summary: 'Create a new course variable (Admin only)' })
  @ApiResponse({ status: 201, description: 'The variable has been successfully created.', type: CourseVariable })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'variable name or slug already exists.' })
  @ApiBody({ type: CreateCourseVariableDto, description: 'Data for creating a new variable' })
  create(@Body() createCoursevariableDto: CreateCourseVariableDto): Promise<CourseVariable> {
    return this.coursevariablesService.create(createCoursevariableDto);
  }

  // --- GET /course-variables ---
  @Get()
  @RequirePermissions('course-variables:list')
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Paginated list of course variables.', type: Paginated<any> })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Paginate() query: PaginateQuery): Promise<Paginated<any>> {
    return this.coursevariablesService.findAll(query);
  }

  // --- GET /course-variables/:id ---
  @Get(':id')
  @RequirePermissions('course-variables:get_by_id')
  @ApiOperation({ summary: 'Get a single course variable by ID' })
  @ApiParam({ name: 'id', description: 'The UUID of the course variable', type: 'string' })
  @ApiResponse({ status: 200, description: 'The requested course variable.', type: CourseVariable })
  @ApiResponse({ status: 404, description: 'variable not found.' })
  findOne(@Param('id') id: string): Promise<CourseVariable> {
    return this.coursevariablesService.findOne(id);
  }

  // --- PATCH /course-variables/:id ---
  @Patch(':id')
  @RequirePermissions('course-variables:update')
  @ApiOperation({ summary: 'Update an existing course variable (Admin only)' })
  @ApiParam({ name: 'id', description: 'The UUID of the course variable to update', type: 'string' })
  @ApiBody({ type: CreateCourseVariableDto, description: 'Partial data to update the variable' })
  @ApiResponse({ status: 200, description: 'The variable has been successfully updated.', type: CourseVariable })
  @ApiResponse({ status: 404, description: 'variable not found.' })
  @ApiResponse({ status: 409, description: 'Updated name or slug already exists.' })
  update(@Param('id') id: string, @Body() updateCoursevariableDto: UpdateCourseVariableDto): Promise<CourseVariable> {
    return this.coursevariablesService.update(id, updateCoursevariableDto);
  }

  // --- DELETE /course-variables/:id ---
  @Delete(':id')
  @RequirePermissions('course-variables:delete')
  @ApiOperation({ summary: 'Delete a course variable by ID (Admin only)' })
  @ApiParam({ name: 'id', description: 'The UUID of the course variable to delete', type: 'string' })
  @ApiResponse({ status: 200, description: 'variable successfully deleted.' })
  @ApiResponse({ status: 404, description: 'variable not found.' })
  remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.coursevariablesService.remove(id);
  }
}