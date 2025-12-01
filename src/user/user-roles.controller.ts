import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
    UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UserRolesPermissionsService } from './user-role-permission.service';
import { Role } from './entities/roles.entity';
import { RolePermission } from './entities/roles-permission.entity';
import { AddPermissionsDto, CreateRolesBulkDto } from './dto/roles-and-permissions.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiBearerAuth('access_token')
@ApiTags('User - Roles')
@Controller('user/roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UserRolesController {
    constructor(private readonly rolesService: UserRolesPermissionsService) { }

    @Post('bulk')
    @RequirePermissions('roles:create_multiple')
    @ApiOperation({ summary: 'Create multiple roles' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Roles created successfully',
        type: [Role],
    })
    async createRolesBulk(@Body() body: CreateRolesBulkDto): Promise<Role[]> {
        return this.rolesService.createRoles(body);
    }

    @Post(':roleId/permissions')
    @RequirePermissions('roles:assign_permissions')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Add permissions to a role' })
    @ApiParam({ name: 'roleId', description: 'UUID of the role' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Permissions added to role successfully',
        type: [RolePermission],
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Role not found',
    })
    async addPermissionsToRole(
        @Param('roleId', ParseUUIDPipe) roleId: string,
        @Body() body: AddPermissionsDto,
    ): Promise<RolePermission[]> {
        return this.rolesService.addPermissionsToRole(roleId, body.permissions);
    }

    @Get(':roleId')
    @RequirePermissions('roles:get')
    @ApiOperation({ summary: 'Get a role with its permissions' })
    @ApiParam({ name: 'roleId', description: 'UUID of the role' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Role retrieved successfully',
        type: Role,
    })
    async getRole(@Param('roleId', ParseUUIDPipe) roleId: string): Promise<Role> {
        return this.rolesService.getRoleWithPermissions(roleId);
    }

    @Get()
    @RequirePermissions('roles:list')
    @ApiOperation({ summary: 'Get all roles with their permissions' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Roles retrieved successfully',
        type: [Role],
    })
    async getAllRoles(): Promise<Role[]> {
        return this.rolesService.getAllRoles();
    }
}
