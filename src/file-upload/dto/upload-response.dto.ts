import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadResponseDto {
    @ApiPropertyOptional()
    message?: string;

    @ApiPropertyOptional()
    fileId?: string;

    @ApiPropertyOptional()
    fileUrl?: string;

    @ApiPropertyOptional()
    error?: string;

    @ApiPropertyOptional()
    fileName?: string;
}