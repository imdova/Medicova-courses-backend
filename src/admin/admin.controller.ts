import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

// Define allowed periods for validation
enum StatsPeriod {
  YEARLY = 'yearly',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
}
enum StatsType {
  COURSES = 'courses',
  STUDENTS = 'students',
  INSTRUCTORS = 'instructors',
}

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

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:courses:overview')
  @Get('courses/overview')
  @ApiOperation({ summary: 'Get course overview statistics' })
  @ApiResponse({
    status: 200,
    description: 'Course overview statistics retrieved successfully',
  })
  async getCourseOverview(): Promise<any> {
    return this.adminService.getCourseOverview();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:courses:weekly-sales')
  @Get('courses/weekly-sales')
  @ApiOperation({ summary: 'Retrieve weekly course sales and earnings data.' })
  async getWeeklySales() {
    return this.adminService.getWeeklySales();
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('admin:instructors:top')
  @Get('instructors/top')
  @ApiOperation({ summary: 'Retrieve data for the “Top Instructors” section.' })
  async getTopInstructorsAnalytics() {
    return this.adminService.getTopInstructorsAnalytics();
  }

  // New Endpoint for Time-Series Statistics
  // @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  // @RequirePermissions('admin:dashboard:time-series')
  @Get('stats/time-series')
  @ApiOperation({ summary: 'Get time-series statistics (Courses, Students, or Instructors) over a period.' })
  @ApiQuery({
    name: 'period',
    required: true,
    enum: StatsPeriod,
    description: 'The aggregation period (yearly, monthly, or weekly)',
  })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: StatsType,
    description: 'The type of entity to count (courses, students, or instructors)',
  })
  @ApiResponse({
    status: 200,
    description: 'Time-series statistics retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid period or type requested.',
  })
  async getTimeSeriesStats(
    @Query('period') period: StatsPeriod,
    @Query('type') type: StatsType,
  ): Promise<any> {
    if (!Object.values(StatsPeriod).includes(period as StatsPeriod)) {
      throw new BadRequestException('Invalid period. Must be yearly, monthly, or weekly.');
    }
    if (!Object.values(StatsType).includes(type as StatsType)) {
      throw new BadRequestException('Invalid type. Must be courses, students, or instructors.');
    }

    return this.adminService.getTimeSeriesStats(period, type);
  }
}
