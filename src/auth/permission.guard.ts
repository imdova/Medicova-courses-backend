import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './decorator/permission.decorator';
import { DataSource } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { RolePermission } from '../user/entities/roles-permission.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector, private dataSource: DataSource) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (!requiredPermissions || requiredPermissions.length === 0) return true;

        const request = context.switchToHttp().getRequest();
        const user: any = request.user;

        if (!user) throw new ForbiddenException('No user found in request');

        const hasPermission = requiredPermissions.every(p => user.permissions.includes(p));
        if (!hasPermission) throw new ForbiddenException('Insufficient permissions');

        return true;
    }
}
