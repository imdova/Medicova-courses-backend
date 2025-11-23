import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    filename: string;

    @ApiProperty()
    originalName: string;

    @ApiProperty()
    mimeType: string;

    @ApiProperty()
    size: number;

    @ApiProperty()
    url: string;

    @ApiProperty()
    bucket: string;

    @ApiProperty()
    created_at: Date;
}