import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CourseCategoryService } from './course-category.service';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorator/roles.decorator';

@ApiTags('Course Categories')
@Controller('course-categories')
@UseGuards(AuthGuard('jwt'), RolesGuard)
//@Roles(UserRole.ADMIN)
export class CourseCategoryController {
  constructor(private readonly courseCategoryService: CourseCategoryService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new category or subcategory' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
  })
  async create(@Body() dto: CreateCourseCategoryDto, @Req() req) {
    return this.courseCategoryService.create(dto, req.user.sub);
  }

  @Get()
  //@Roles(UserRole.ADMIN, UserRole.INSTRUCTOR)
  @ApiOperation({ summary: 'Get all categories with subcategories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of categories',
  })
  async findAll() {
    return this.courseCategoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID with subcategories' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category found',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async findOne(@Param('id') id: string) {
    return this.courseCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateCourseCategoryDto) {
    return this.courseCategoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category soft-deleted successfully',
  })
  async remove(@Param('id') id: string) {
    return this.courseCategoryService.remove(id);
  }
}
