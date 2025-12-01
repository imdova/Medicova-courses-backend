import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
    @ApiProperty({
        example: 'marketing_manager',
        description: 'Unique role name',
    })
    @IsString()
    name: string;

    @ApiPropertyOptional({
        example: 'Manages marketing campaigns and team',
        description: 'Role description',
    })
    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateRolesBulkDto {
    @ApiProperty({
        example: [
            { name: 'admin', description: 'Full system administrator' },
            { name: 'moderator', description: 'Content moderator' }
        ],
        description: 'List of roles to create',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
            },
        },
    })
    @IsArray()
    @ArrayNotEmpty()
    roles: CreateRoleDto[];
}

export class AddPermissionsDto {
    @ApiProperty({
        example: ['read_articles', 'write_articles'],
        description: 'List of permissions to add to the role',
        type: [String],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    permissions: string[];
}

export class CreatePermissionsBulkDto {
    @ApiProperty({
        example: ["read_articles", "write_articles", "delete_articles"],
        type: [String],
    })
    @IsArray()
    @IsString({ each: true })
    permissions: string[];
}
