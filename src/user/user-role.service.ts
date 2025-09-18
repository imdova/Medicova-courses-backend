import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/roles.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/roles-permission.entity';

@Injectable()
export class UserRolesService {
    constructor(
        @InjectRepository(Role)
        private readonly roleRepository: Repository<Role>,
        @InjectRepository(Permission)
        private readonly permissionRepository: Repository<Permission>,
        @InjectRepository(RolePermission)
        private readonly rolePermissionRepository: Repository<RolePermission>,
    ) { }

    async createRoles(roleNames: string[]): Promise<Role[]> {
        // Find existing roles to avoid duplicates
        const existingRoles = await this.roleRepository.find({
            where: { name: In(roleNames) },
        });

        const existingRoleNames = existingRoles.map(role => role.name);
        const newRoleNames = roleNames.filter(name => !existingRoleNames.includes(name));

        // Create new roles
        const newRoles = newRoleNames.map(name => this.roleRepository.create({ name }));

        return this.roleRepository.save(newRoles);
    }

    async addPermissionsToRole(roleId: string, permissionNames: string[]): Promise<RolePermission[]> {
        // Ensure role exists
        const role = await this.roleRepository.findOne({ where: { id: roleId } });
        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        // Ensure permissions exist
        const permissions = await this.permissionRepository.find({
            where: { name: In(permissionNames) },
        });

        if (permissions.length !== permissionNames.length) {
            const missing = permissionNames.filter(
                name => !permissions.some(p => p.name === name),
            );
            throw new NotFoundException(`Permissions not found: ${missing.join(', ')}`);
        }

        // Remove old connections first (optional, up to you)
        await this.rolePermissionRepository.delete({
            role: { id: roleId },
            permission: { id: In(permissions.map(p => p.id)) },
        });

        // Create new role-permission connections
        const rolePermissions = permissions.map(permission =>
            this.rolePermissionRepository.create({ role, permission }),
        );

        return this.rolePermissionRepository.save(rolePermissions);
    }

    async getRoleWithPermissions(roleId: string): Promise<Role> {
        const role = await this.roleRepository.findOne({
            where: { id: roleId },
            relations: ['rolePermissions', 'rolePermissions.permission'],
        });

        if (!role) {
            throw new NotFoundException(`Role with ID ${roleId} not found`);
        }

        return role;
    }

    async getAllRoles(): Promise<Role[]> {
        return this.roleRepository.find({
            relations: ['rolePermissions', 'rolePermissions.permission'],
        });
    }

    async getAllPermissions(): Promise<Permission[]> {
        return this.permissionRepository.find();
    }

    async createPermissions(permissionNames: string[]): Promise<Permission[]> {
        // Find existing permissions
        const existing = await this.permissionRepository.find({
            where: { name: In(permissionNames) },
        });
        const existingNames = existing.map(p => p.name);

        // Filter new ones
        const newNames = permissionNames.filter(name => !existingNames.includes(name));
        const newPermissions = newNames.map(name => this.permissionRepository.create({ name }));

        return this.permissionRepository.save(newPermissions);
    }
}