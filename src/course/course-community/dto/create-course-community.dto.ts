import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCourseCommunityDto {
    @ApiProperty({
        description: 'The text content of the post or reply',
        example: 'Can someone explain the difference between TypeORM and Prisma?',
    })
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({
        description: 'The UUID of the parent comment (used when replying to another comment)',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsOptional()
    @IsUUID()
    parentId?: string;
}
