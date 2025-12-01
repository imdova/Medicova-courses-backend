// src/department/services/department.service.ts
import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { User } from 'src/user/entities/user.entity';

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
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Create and save the department
        const department = this.departmentRepository.create({
            ...createDepartmentDto,
            createdBy: user,
        });

        return await this.departmentRepository.save(department);
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