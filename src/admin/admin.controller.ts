import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:dashboard')
  @Get('dashboard')
  @ApiOperation({ summary: 'Get comprehensive dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getDashboardStats(): Promise<any> {
    return this.adminService.getDashboardStats();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:students:list')
  @Get('students')
  @ApiOperation({ summary: 'Get all students in the system' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination (default: 1)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)'
  })
  @ApiResponse({
    status: 200,
    description: 'List of students retrieved successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async getAllStudents(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<any> {
    return this.adminService.getAllStudents(page, limit);
  }

  // @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  // @RequirePermissions('admin:courses:overview')
  @Get('courses/overview')
  @ApiOperation({ summary: 'Get course overview statistics' })
  @ApiResponse({
    status: 200,
    description: 'Course overview statistics retrieved successfully',
  })
  async getCourseOverview(): Promise<any> {
    return this.adminService.getCourseOverview();
  }

}
