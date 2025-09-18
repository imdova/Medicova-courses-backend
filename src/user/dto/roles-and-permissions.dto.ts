import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class CreateRolesBulkDto {
    @ApiProperty({
        example: ["admin", "student", "instructor", "academy_user", "academy_admin"],
        description: 'List of role names to create',
        type: [String],
    })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    roles: string[];
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
