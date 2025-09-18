import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserRolesService } from './user-role.service';
import { Role } from './entities/roles.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/roles-permission.entity';
import { AddPermissionsDto, CreatePermissionsBulkDto, CreateRolesBulkDto } from './dto/roles-and-permissions.dto';

@ApiTags('User - Roles & Permissions')
@Controller('user/roles')
export class UserRolesController {
    constructor(private readonly rolesService: UserRolesService) { }

    @Post('bulk')
    @ApiOperation({ summary: 'Create multiple roles' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Roles created successfully',
        type: [Role]
    })
    async createRolesBulk(@Body() body: CreateRolesBulkDto): Promise<Role[]> {
        return this.rolesService.createRoles(body.roles);
    }

    @Post('permissions/bulk')
    @ApiOperation({ summary: 'Create multiple permissions' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Permissions created successfully',
        type: [Permission],
    })
    async createPermissionsBulk(@Body() body: CreatePermissionsBulkDto): Promise<Permission[]> {
        return this.rolesService.createPermissions(body.permissions);
    }

    @Post(':roleId/permissions')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add permissions to a role' })
    @ApiParam({ name: 'roleId', description: 'UUID of the role' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Permissions added to role successfully',
        type: [RolePermission]
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Role not found'
    })
    async addPermissionsToRole(
        @Param('roleId', ParseUUIDPipe) roleId: string,
        @Body() body: AddPermissionsDto,
    ): Promise<RolePermission[]> {
        return this.rolesService.addPermissionsToRole(roleId, body.permissions);
    }

    @Get(':roleId')
    @ApiOperation({ summary: 'Get a role with its permissions' })
    @ApiParam({ name: 'roleId', description: 'UUID of the role' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Role retrieved successfully',
        type: Role
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Role not found'
    })
    async getRole(@Param('roleId', ParseUUIDPipe) roleId: string): Promise<Role> {
        return this.rolesService.getRoleWithPermissions(roleId);
    }

    @Get()
    @ApiOperation({ summary: 'Get all roles with their permissions' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Roles retrieved successfully',
        type: [Role]
    })
    async getAllRoles(): Promise<Role[]> {
        return this.rolesService.getAllRoles();
    }

    @Get('permissions/all')
    @ApiOperation({ summary: 'Get all available permissions' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Permissions retrieved successfully',
        type: [Permission]
    })
    async getAllPermissions(): Promise<Permission[]> {
        return this.rolesService.getAllPermissions();
    }
}