// src/user/services/employee.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { Department } from './entities/department.entity';
import { Role } from './entities/roles.entity';
import { ProfileService } from 'src/profile/profile.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { QueryFailedError } from 'typeorm';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { QueryConfig } from 'src/common/utils/query-options';

export interface EmployeeFilters {
    departmentId?: string;
    academyId?: string;
    role?: string;
    status?: string;
}

export const EMPLOYEE_PAGINATION_CONFIG: QueryConfig<User> = {
    sortableColumns: ['created_at', 'email'],
    defaultSortBy: [['created_at', 'DESC']],
    searchableColumns: [
        'email',
        'profile.firstName',
        'profile.lastName',
        'profile.jobTitle',
        'department.name',
    ],
    filterableColumns: {
        email: [FilterOperator.ILIKE, FilterOperator.EQ],
        'profile.firstName': [FilterOperator.ILIKE],
        'profile.lastName': [FilterOperator.ILIKE],
        'profile.jobTitle': [FilterOperator.ILIKE],
        'profile.jobLevel': [FilterOperator.EQ],
        'profile.employeeId': [FilterOperator.EQ],
        'department.id': [FilterOperator.EQ],
        'department.name': [FilterOperator.ILIKE],
        'academy.id': [FilterOperator.EQ],
        'role.name': [FilterOperator.EQ],
        'profile.phoneNumber': [FilterOperator.ILIKE],
    },
    relations: {
        profile: true,
        department: true,
        role: true,
        academy: true,
    },
    maxLimit: 100,
    defaultLimit: 20,
};

@Injectable()
export class EmployeeService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        private readonly profileService: ProfileService,
    ) { }

    async create(createEmployeeDto: CreateEmployeeDto, creatorId: string): Promise<User> {
        const {
            departmentId,
            jobTitle,
            jobLevel,
            phoneNumber,
            firstName,
            lastName,
            email,
            password,
            role = 'employee',
            photoUrl,
            ...rest
        } = createEmployeeDto;

        // Get creator with academy
        const creator = await this.userRepository.findOne({
            where: { id: creatorId },
            relations: ['academy'], // Get creator's academy
        });

        if (!creator) {
            throw new NotFoundException('Creator user not found');
        }

        // Verify department exists and creator has permission
        const department = await this.departmentRepository.findOne({
            where: {
                id: departmentId,
                createdBy: { id: creatorId },
            },
            relations: ['createdBy'],
        });

        if (!department) {
            throw new ForbiddenException(
                'Department not found or you don\'t have permission to add employees to this department',
            );
        }

        // Check if email already exists
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await this.userRepository.findOne({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Get employee role
        const employeeRole = await this.roleRepository.findOne({
            where: { name: role },
        });

        if (!employeeRole) {
            throw new NotFoundException(`Role "${role}" not found`);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4();

        // Create user with department and academy
        const user = this.userRepository.create({
            email: normalizedEmail,
            password: hashedPassword,
            role: employeeRole,
            department,
            academy: creator.academy, // Assign creator's academy to employee
            emailVerificationToken: verificationToken,
            ...rest,
        });

        try {
            const savedUser = await this.userRepository.save(user);

            // Create profile with employee details
            await this.profileService.createEmployeeProfile(savedUser.id, {
                firstName: firstName || '',
                lastName: lastName || '',
                photoUrl,
                phoneNumber,
                jobTitle,
                jobLevel,
            });

            // Remove sensitive data from response
            const { password: _, emailVerificationToken: __, ...userWithoutSensitive } = savedUser;
            return userWithoutSensitive as User;
        } catch (error) {
            if (error instanceof QueryFailedError && (error as any).code === '23505') {
                const detail = (error as any).detail.toLowerCase();
                if (detail.includes('email')) {
                    throw new ConflictException('Email is already in use.');
                }
                if (detail.includes('employee_id')) {
                    throw new ConflictException('Employee ID is already in use.');
                }
                throw new ConflictException('User already exists.');
            }
            throw error;
        }
    }

    async findAllWithPagination(
        query: PaginateQuery,
        filterType?: 'academy' | 'department_creator' | null,
        filterValue?: string,
    ): Promise<any> {
        const queryBuilder = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.profile', 'profile')
            .leftJoinAndSelect('user.department', 'department')
            .leftJoinAndSelect('user.role', 'role')
            .leftJoinAndSelect('user.academy', 'academy')
            .where('user.department IS NOT NULL');

        // Apply role-based filters
        if (filterType === 'academy' && filterValue) {
            queryBuilder.andWhere('academy.id = :academyId', { academyId: filterValue });
        } else if (filterType === 'department_creator' && filterValue) {
            const departments = await this.departmentRepository.find({
                where: { createdBy: { id: filterValue } },
                select: ['id'],
            });

            const departmentIds = departments.map(dept => dept.id);
            if (departmentIds.length > 0) {
                queryBuilder.andWhere('user.departmentId IN (:...departmentIds)', {
                    departmentIds
                });
            } else {
                return {
                    data: [],
                    meta: {
                        totalItems: 0,
                        itemCount: 0,
                        itemsPerPage: query.limit || 20,
                        totalPages: 0,
                        currentPage: query.page || 1,
                    },
                    links: {},
                };
            }
        }

        // Handle query filters (nestjs-paginate will parse dot notation automatically)
        return paginate(query, queryBuilder, EMPLOYEE_PAGINATION_CONFIG);
    }

    async findAll(
        userId: string,
        userRole: string,
        userAcademyId: string, // User's academy ID from JWT
        filters?: EmployeeFilters,
    ): Promise<User[]> {
        let query = this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.profile', 'profile')
            .leftJoinAndSelect('user.department', 'department')
            .leftJoinAndSelect('user.role', 'role')
            .leftJoinAndSelect('department.createdBy', 'createdBy')
            .leftJoinAndSelect('user.academy', 'academy') // Join academy
            .where('user.department IS NOT NULL'); // Only users with departments (employees)

        // Apply role-based filtering
        if (userRole === 'admin') {
            // Admin sees all employees - no additional filters
        } else if (userRole === 'academy_admin') {
            // Academy admin sees employees in their academy
            query = query.andWhere('academy.id = :userAcademyId', {
                userAcademyId: userAcademyId || null
            });
        } else {
            // Department creator sees only their department's employees
            const departments = await this.departmentRepository.find({
                where: { createdBy: { id: userId } },
                select: ['id'],
            });
            const departmentIds = departments.map(dept => dept.id);

            if (departmentIds.length > 0) {
                query = query.andWhere('user.departmentId IN (:...departmentIds)', {
                    departmentIds
                });
            } else {
                return []; // No departments = no employees
            }
        }

        // Apply filters from query parameters
        if (filters?.departmentId) {
            query = query.andWhere('user.departmentId = :filterDepartmentId', {
                filterDepartmentId: filters.departmentId
            });
        }

        if (filters?.academyId) {
            query = query.andWhere('academy.id = :filterAcademyId', {
                filterAcademyId: filters.academyId
            });
        }

        if (filters?.role) {
            query = query.andWhere('role.name = :role', {
                role: filters.role
            });
        }

        return await query
            .orderBy('user.created_at', 'DESC')
            .getMany();
    }

    async findOne(id: string, userId: string, userRole: string): Promise<User> {
        const employee = await this.userRepository.findOne({
            where: {
                id, department: { id: () => 'departmentId IS NOT NULL' } as any, // Raw SQL
            },
            relations: ['profile', 'department', 'role', 'department.createdBy'],
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        // Check permissions
        if (userRole === 'admin') {
            return employee;
        }

        if (userRole === 'academy_admin') {
            if (employee.academy?.id !== userId) {
                throw new ForbiddenException('You can only view employees in your academy');
            }
            return employee;
        }

        // Check if user is the department creator
        if (employee.department.createdBy.id !== userId) {
            throw new ForbiddenException('You can only view employees in your departments');
        }

        return employee;
    }

    async update(
        id: string,
        updateEmployeeDto: UpdateEmployeeDto,
        updaterId: string,
    ): Promise<User> {
        const employee = await this.findOne(id, updaterId, 'any'); // Check permissions first

        const { departmentId, ...employeeData } = updateEmployeeDto;

        // Update department if provided
        if (departmentId) {
            const department = await this.departmentRepository.findOne({
                where: { id: departmentId, createdBy: { id: updaterId } },
            });

            if (!department) {
                throw new ForbiddenException('Department not found or no permission');
            }

            employee.department = department;
        }

        // Update user fields
        if (employeeData.email) {
            employee.email = employeeData.email.trim().toLowerCase();
        }

        // Update profile fields
        // if (employee.profile) {
        //     await this.profileService.updateEmployeeProfile(id, {
        //         jobTitle: employeeData.jobTitle,
        //         jobLevel: employeeData.jobLevel,
        //         phoneNumber: employeeData.phoneNumber,
        //     });
        // }

        await this.userRepository.save(employee);
        return await this.findOne(id, updaterId, 'any');
    }

    async assignToDepartment(
        employeeId: string,
        departmentId: string,
        creatorId: string,
    ): Promise<User> {
        const department = await this.departmentRepository.findOne({
            where: { id: departmentId, createdBy: { id: creatorId } },
        });

        if (!department) {
            throw new ForbiddenException('Department not found or no permission');
        }

        const employee = await this.userRepository.findOne({
            where: { id: employeeId },
        });

        if (!employee) {
            throw new NotFoundException('Employee not found');
        }

        employee.department = department;
        await this.userRepository.save(employee);

        return this.findOne(employeeId, creatorId, 'any');
    }

    async getEmployeesByCreator(creatorId: string): Promise<User[]> {
        const departments = await this.departmentRepository.find({
            where: { createdBy: { id: creatorId } },
            relations: ['employees', 'employees.profile', 'employees.role'],
        });

        return departments.flatMap(dept => dept.employees);
    }

    async getEmployeesInMyDepartment(userId: string): Promise<User[]> {
        const currentUser = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['department'],
        });

        if (!currentUser?.department) {
            return [];
        }

        return this.userRepository.find({
            where: { department: { id: currentUser.department.id } },
            relations: ['profile', 'role'],
            order: { created_at: 'DESC' },
        });
    }

    async updateStatus(id: string, status: string, updaterId: string): Promise<User> {
        const employee = await this.findOne(id, updaterId, 'any');
        return await this.userRepository.save(employee);
    }

    async remove(id: string, deleterId: string, deleterRole: string): Promise<void> {
        const employee = await this.findOne(id, deleterId, deleterRole);
        await this.userRepository.remove(employee);
    }
}