// src/department/services/department.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { User } from 'src/user/entities/user.entity';
import { FilterOperator, paginate, PaginateQuery } from 'nestjs-paginate';
import { QueryConfig } from 'src/common/utils/query-options';


export const DEPARTMENT_PAGINATION_CONFIG: QueryConfig<Department> = {
    sortableColumns: ['created_at', 'name'],
    defaultSortBy: [['created_at', 'DESC']],
    searchableColumns: ['name'],
    filterableColumns: {
        name: [FilterOperator.ILIKE, FilterOperator.EQ],
        'createdBy.id': [FilterOperator.EQ],
        'academy.id': [FilterOperator.EQ],
        'createdBy.email': [FilterOperator.ILIKE],
        'createdBy.profile.firstName': [FilterOperator.ILIKE],
        'createdBy.profile.lastName': [FilterOperator.ILIKE],
    },
    relations: {
        createdBy: true,
        academy: true,
        employees: true,
    },
    maxLimit: 100,
    defaultLimit: 20,
};


@Injectable()
export class DepartmentService {
    constructor(
        @InjectRepository(Department)
        private readonly departmentRepository: Repository<Department>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async create(
        createDepartmentDto: CreateDepartmentDto,
        userId: string,
    ): Promise<Department> {
        // Check if department with same name already exists
        const existingDepartment = await this.departmentRepository.findOne({
            where: { name: createDepartmentDto.name },
        });

        if (existingDepartment) {
            throw new ConflictException(
                `Department with name "${createDepartmentDto.name}" already exists`,
            );
        }

        // Find the user who is creating the department
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['academy']
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Create and save the department
        const department = this.departmentRepository.create({
            ...createDepartmentDto,
            createdBy: user,
            academy: user.academy || null,
        });

        return await this.departmentRepository.save(department);
    }

    async findAllWithPagination(
        query: PaginateQuery,
        filterType?: 'academy' | 'creator' | null,
        filterValue?: string,
    ): Promise<any> {
        // Create query builder with joins
        const queryBuilder = this.departmentRepository
            .createQueryBuilder('department')
            .leftJoinAndSelect('department.createdBy', 'createdBy')
            .leftJoinAndSelect('department.academy', 'academy')
            .leftJoinAndSelect('department.employees', 'employees');

        // Apply role-based filters
        if (filterType === 'academy' && filterValue) {
            queryBuilder.andWhere('academy.id = :academyId', { academyId: filterValue });
        } else if (filterType === 'creator' && filterValue) {
            queryBuilder.andWhere('createdBy.id = :creatorId', { creatorId: filterValue });
        }

        // Clone the config to avoid mutations
        const config = { ...DEPARTMENT_PAGINATION_CONFIG };

        // Handle custom filters from query params
        // nestjs-paginate automatically handles dot notation like 'academy.id'
        // We just need to ensure the values are strings, not objects
        if (query.filter) {
            // Convert any object values in filter to strings
            const processedFilter: Record<string, any> = {};

            for (const [key, value] of Object.entries(query.filter)) {
                if (value && typeof value === 'object' && 'id' in value) {
                    // If value is an object like {id: '123'}, extract the id
                    processedFilter[key] = (value as any).id;
                } else {
                    processedFilter[key] = value;
                }
            }

            // Use the processed filter
            query.filter = processedFilter as any;
        }

        return paginate(query, queryBuilder, config);
    }

    async findAll(): Promise<Department[]> {
        return await this.departmentRepository.find({
            relations: ['createdBy', 'employees'],
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Department> {
        const department = await this.departmentRepository.findOne({
            where: { id },
            relations: ['createdBy', 'employees', 'employees.profile'],
        });

        if (!department) {
            throw new Error('Department not found');
        }

        return department;
    }

    async findByCreator(userId: string): Promise<Department[]> {
        return await this.departmentRepository.find({
            where: { createdBy: { id: userId } },
            relations: ['employees', 'employees.profile'],
            order: { created_at: 'DESC' },
        });
    }

    async update(
        id: string,
        updateData: Partial<CreateDepartmentDto>,
    ): Promise<Department> {
        const department = await this.findOne(id);

        // Check if new name conflicts with existing department
        if (updateData.name && updateData.name !== department.name) {
            const existingWithName = await this.departmentRepository.findOne({
                where: { name: updateData.name },
            });

            if (existingWithName) {
                throw new ConflictException(
                    `Department with name "${updateData.name}" already exists`,
                );
            }
        }

        Object.assign(department, updateData);
        return await this.departmentRepository.save(department);
    }

    async remove(id: string): Promise<void> {
        const department = await this.findOne(id);
        await this.departmentRepository.remove(department);
    }
}