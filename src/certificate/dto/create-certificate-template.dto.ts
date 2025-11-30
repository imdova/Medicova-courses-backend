import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
        enum: ['continuing_education', 'instructor_recognition', 'general_completion', 'advanced_workshop'],
        example: 'advanced_workshop',
        description: 'Type of certificate template'
    })
    type: string;
}