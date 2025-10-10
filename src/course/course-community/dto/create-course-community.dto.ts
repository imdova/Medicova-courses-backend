import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateCourseCommunityDto {
    @ApiProperty({ description: 'Comment or reply content' })
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional({ description: 'Parent comment ID (for replies)' })
    @IsOptional()
    @IsUUID()
    parentId?: string;
}
