// src/user/controllers/employee.controller.ts
import {
    Controller,
    Post,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    Req,
    Query,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBody,
    ApiBearerAuth,
    ApiParam,
    ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
//import { UpdateEmployeeDto } from './dto/update-employee.dto';

@ApiTags('Employees')
@ApiBearerAuth('access_token')
@Controller('employees')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class EmployeeController {
    constructor(private readonly employeeService: EmployeeService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new employee' })
    @ApiBody({ type: CreateEmployeeDto })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Employee created successfully',
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Email or Employee ID already exists',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'No permission to create employees in this department',
    })
    create(@Body() createEmployeeDto: CreateEmployeeDto, @Req() req) {
        const creatorId = req.user.sub;
        return this.employeeService.create(createEmployeeDto, creatorId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all employees with pagination and filters' })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
    @ApiQuery({ name: 'filter.department.id', required: false, type: String, description: 'Filter by department ID' })
    @ApiQuery({ name: 'filter.academy.id', required: false, type: String, description: 'Filter by academy ID' })
    @ApiQuery({ name: 'filter.role.name', required: false, type: String, description: 'Filter by role' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Paginated list of employees',
    })
    findAll(
        @Req() req,
        @Paginate() query: PaginateQuery,
    ) {
        const userId = req.user.sub;
        const userRole = req.user.role;
        const userAcademyId = req.user.academyId;

        // Apply role-based filtering
        if (userRole === 'admin') {
            return this.employeeService.findAllWithPagination(query, null, null);
        } else if (userRole === 'academy_admin') {
            return this.employeeService.findAllWithPagination(query, 'academy', userAcademyId);
        } else {
            return this.employeeService.findAllWithPagination(query, 'department_creator', userId);
        }
    }

    @Get('my-department')
    @ApiOperation({ summary: 'Get employees in my department (for employees)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of employees in current user\'s department',
    })
    getMyDepartmentEmployees(@Req() req) {
        const userId = req.user.sub;
        return this.employeeService.getEmployeesInMyDepartment(userId);
    }

    @Get('my-organization')
    @ApiOperation({ summary: 'Get all employees in my organization (for admins/managers)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'List of all employees in organization',
    })
    getMyOrganizationEmployees(@Req() req) {
        const creatorId = req.user.sub;
        return this.employeeService.getEmployeesByCreator(creatorId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get employee by ID' })
    @ApiParam({ name: 'id', description: 'Employee ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Employee details',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Employee not found',
    })
    findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
        const userId = req.user.sub;
        const userRole = req.user.role;
        return this.employeeService.findOne(id, userId, userRole);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update employee' })
    @ApiParam({ name: 'id', description: 'Employee ID' })
    @ApiBody({ type: UpdateEmployeeDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Employee updated successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Employee not found',
    })
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateEmployeeDto: UpdateEmployeeDto,
        @Req() req,
    ) {
        const updaterId = req.user.sub;
        return this.employeeService.update(id, updateEmployeeDto, updaterId);
    }

    @Patch(':id/department/:departmentId')
    @ApiOperation({ summary: 'Assign employee to department' })
    @ApiParam({ name: 'id', description: 'Employee ID' })
    @ApiParam({ name: 'departmentId', description: 'Department ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Employee assigned successfully',
    })
    assignToDepartment(
        @Param('id', ParseUUIDPipe) employeeId: string,
        @Param('departmentId', ParseUUIDPipe) departmentId: string,
        @Req() req,
    ) {
        const creatorId = req.user.sub;
        return this.employeeService.assignToDepartment(employeeId, departmentId, creatorId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete employee' })
    @ApiParam({ name: 'id', description: 'Employee ID' })
    @ApiResponse({
        status: HttpStatus.NO_CONTENT,
        description: 'Employee deleted successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Employee not found',
    })
    @ApiResponse({
        status: HttpStatus.FORBIDDEN,
        description: 'No permission to delete employee',
    })
    remove(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
        const deleterId = req.user.sub;
        const deleterRole = req.user.role;
        return this.employeeService.remove(id, deleterId, deleterRole);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update employee status (active/inactive/terminated)' })
    @ApiParam({ name: 'id', description: 'Employee ID' })
    @ApiBody({ schema: { properties: { status: { type: 'string', example: 'inactive' } } } })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Employee status updated',
    })
    updateStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body('status') status: string,
        @Req() req,
    ) {
        const updaterId = req.user.sub;
        return this.employeeService.updateStatus(id, status, updaterId);
    }
}