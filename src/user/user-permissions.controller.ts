import {
    Controller,
    Post,
    Get,
    Body,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRolesPermissionsService } from './user-role-permission.service';
import { Permission } from './entities/permission.entity';
import { CreatePermissionsBulkDto } from './dto/roles-and-permissions.dto';
import { PermissionsGuard } from '../auth/permission.guard';
import { AuthGuard } from '@nestjs/passport';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiBearerAuth('access_token')
@ApiTags('User - Permissions')
@Controller('user/permissions')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class UserPermissionsController {
    constructor(private readonly rolesService: UserRolesPermissionsService) { }

    @Post('bulk')
    @RequirePermissions('permissions:create_multiple')
    @ApiOperation({ summary: 'Create multiple permissions' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Permissions created successfully',
        type: [Permission],
    })
    async createPermissionsBulk(@Body() body: CreatePermissionsBulkDto): Promise<Permission[]> {
        return this.rolesService.createPermissions(body.permissions);
    }

    @Get('all')
    @RequirePermissions('permissions:list')
    @ApiOperation({ summary: 'Get all available permissions' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Permissions retrieved successfully',
        type: [Permission],
    })
    async getAllPermissions(): Promise<Permission[]> {
        return this.rolesService.getAllPermissions();
    }
}
