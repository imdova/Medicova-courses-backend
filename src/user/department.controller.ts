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
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { Department } from './entities/department.entity';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

@ApiTags('Departments')
@ApiBearerAuth('access_token')
@Controller('departments')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class DepartmentController {
    constructor(private readonly departmentService: DepartmentService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new department' })
    @ApiBody({ type: CreateDepartmentDto })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'The department has been successfully created.',
        type: Department,
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Department with this name already exists.',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized.',
    })
    create(@Body() createDepartmentDto: CreateDepartmentDto, @Req() req) {
        const userId = req.user.sub; // Get user ID from JWT token
        return this.departmentService.create(createDepartmentDto, userId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all departments with pagination and filters' })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number',
        example: 1
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Items per page',
        example: 20
    })
    @ApiQuery({
        name: 'search',
        required: false,
        type: String,
        description: 'Search term',
        example: 'marketing'
    })
    @ApiQuery({
        name: 'filter.academy.id',
        required: false,
        type: String,
        description: 'Filter by academy ID',
        example: 'acad-123'
    })
    @ApiQuery({
        name: 'filter.createdBy.id',
        required: false,
        type: String,
        description: 'Filter by creator ID',
        example: 'user-456'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Paginated list of departments',
    })
    findAll(
        @Req() req,
        @Paginate() query: PaginateQuery,
    ) {
        const userId = req.user.sub;
        const userRole = req.user.role;
        const userAcademyId = req.user.academyId;

        if (userRole === 'admin') {
            return this.departmentService.findAllWithPagination(query, null, null);
        } else if (userRole === 'academy_admin') {
            return this.departmentService.findAllWithPagination(query, 'academy', userAcademyId);
        } else {
            return this.departmentService.findAllWithPagination(query, 'creator', userId);
        }
    }

    @Get('my-departments')
    @ApiOperation({ summary: 'Get departments created by the current user' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Return departments created by current user.',
        type: [Department],
    })
    findMyDepartments(@Req() req) {
        const userId = req.user.sub;
        return this.departmentService.findByCreator(userId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get department by ID' })
    @ApiParam({ name: 'id', description: 'Department ID' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Return the department.',
        type: Department,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Department not found.',
    })
    findOne(@Param('id') id: string) {
        return this.departmentService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update department' })
    @ApiParam({ name: 'id', description: 'Department ID' })
    @ApiBody({ type: CreateDepartmentDto })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'The department has been successfully updated.',
        type: Department,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Department not found.',
    })
    @ApiResponse({
        status: HttpStatus.CONFLICT,
        description: 'Department with this name already exists.',
    })
    update(@Param('id') id: string, @Body() updateDepartmentDto: CreateDepartmentDto) {
        return this.departmentService.update(id, updateDepartmentDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete department' })
    @ApiParam({ name: 'id', description: 'Department ID' })
    @ApiResponse({
        status: HttpStatus.NO_CONTENT,
        description: 'The department has been successfully deleted.',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Department not found.',
    })
    async remove(@Param('id') id: string) {
        await this.departmentService.remove(id);
    }
}