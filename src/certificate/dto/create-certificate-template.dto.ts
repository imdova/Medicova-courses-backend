import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateType } from '../entities/certificate-template.entity';
import { IsEnum } from 'class-validator';

export class CreateCertificateTemplateDto {
    @ApiProperty({
        example: 'Advanced Workshop Certificate',
        description: 'Name of the certificate template'
    })
    name: string;

    @ApiPropertyOptional({
        example: 'Certificate for advanced workshop completion',
        description: 'Optional description of the template'
    })
    description?: string;

    @ApiProperty({
        enum: TemplateType,
        example: TemplateType.CONTINUING_EDUCATION,
        description: 'Type of certificate template'
    })
    @IsEnum(TemplateType)
    type?: TemplateType;
}