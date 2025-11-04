// dto/import-course-tags.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ImportCourseTagsDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'XLSX or CSV file containing course tags data',
    })
    @IsNotEmpty()
    file: Express.Multer.File;
}

export interface ImportResult {
    success: number;
    failed: number;
    errors: Array<{
        row: number;
        name?: string;
        error: string;
    }>;
}