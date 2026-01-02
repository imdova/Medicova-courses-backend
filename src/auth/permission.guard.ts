import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { PERMISSIONS_KEY } from './decorator/permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    private permissionCache = new Map<string, boolean>();
    private cacheHits = 0;
    private cacheMisses = 0;

    constructor(
        private reflector: Reflector,
        private dataSource: DataSource,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No permissions required = allow access
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            throw new ForbiddenException('No user found in request');
        }

        if (!user.role) {
            throw new ForbiddenException('User has no role assigned');
        }

        // Check each required permission
        for (const permissionName of requiredPermissions) {
            const hasPermission = await this.checkPermission(user.role, permissionName);

            if (!hasPermission) {
                throw new ForbiddenException(`Missing permission: ${permissionName}`);
            }
        }

        return true;
    }

    private async checkPermission(roleName: string, permissionName: string): Promise<boolean> {
        const cacheKey = `${roleName}:${permissionName}`;

        // Check in-memory cache first
        if (this.permissionCache.has(cacheKey)) {
            this.cacheHits++;
            return this.permissionCache.get(cacheKey)!;
        }

        this.cacheMisses++;

        // Database check with optimized query
        const hasPermission = await this.checkPermissionInDatabase(roleName, permissionName);

        // Cache the result
        this.permissionCache.set(cacheKey, hasPermission);

        // Optional: Log cache performance occasionally
        if ((this.cacheHits + this.cacheMisses) % 100 === 0) {
            console.log(`Permission cache stats: Hits=${this.cacheHits}, Misses=${this.cacheMisses}, Hit Rate=${((this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100).toFixed(2)}%`);
        }

        return hasPermission;
    }

    private async checkPermissionInDatabase(roleName: string, permissionName: string): Promise<boolean> {
        try {
            // Optimized EXISTS query with proper indexes
            const query = `
        SELECT EXISTS (
          SELECT 1 
          FROM role_permission rp
          INNER JOIN permission p ON rp."permissionId" = p.id
          INNER JOIN role r ON rp."roleId" = r.id
          WHERE r.name = $1 
          AND p.name = $2
          AND rp.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND r.deleted_at IS NULL
          LIMIT 1
        ) as has_permission;
      `;

            const result = await this.dataSource.query(query, [roleName, permissionName]);
            return result[0]?.has_permission === true;
        } catch (error) {
            console.error('Error checking permission in database:', error);
            return false;
        }
    }

    // Optional: Method to clear cache (useful for testing or when permissions change)
    clearCache(): void {
        this.permissionCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    // Optional: Get cache stats for monitoring
    getCacheStats() {
        return {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            size: this.permissionCache.size,
            hitRate: this.cacheHits + this.cacheMisses > 0
                ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
                : 0,
        };
    }
}