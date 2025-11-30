import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TemplateStatus, TemplateType } from '../entities/certificate-template.entity';

export class UpdateCertificateTemplateDto {
    @ApiPropertyOptional({
        example: 'Updated Certificate Name',
        description: 'Name of the certificate template'
    })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({
        example: 'Updated description',
        description: 'Optional description of the template'
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        enum: TemplateStatus,
        example: TemplateStatus.ACTIVE,
        description: 'Status of the certificate template'
    })
    @IsEnum(TemplateStatus)
    @IsOptional()
    status?: TemplateStatus;

    @ApiPropertyOptional({
        enum: TemplateType,
        example: TemplateType.CONTINUING_EDUCATION,
        description: 'Type of certificate template'
    })
    @IsEnum(TemplateType)
    @IsOptional()
    type?: TemplateType;

    // @ApiPropertyOptional({
    //     example: {
    //         studentName: true,
    //         courseTitle: true,
    //         completionDate: true,
    //         certificateId: true,
    //         instructorSignature: false,
    //         academyLogo: true
    //     },
    //     description: 'Required elements configuration'
    // })
    // @IsOptional()
    // requiredElements?: {
    //     studentName: boolean;
    //     courseTitle: boolean;
    //     completionDate: boolean;
    //     certificateId: boolean;
    //     instructorSignature: boolean;
    //     academyLogo: boolean;
    // };

    // @ApiPropertyOptional({
    //     example: {
    //         size: 'A4 portrait',
    //         orientation: 'portrait',
    //         safeMargin: '10mm',
    //         hasQrCode: true
    //     },
    //     description: 'Template specifications'
    // })
    // @IsOptional()
    // specifications?: {
    //     size: string;
    //     orientation: string;
    //     safeMargin: string;
    //     hasQrCode: boolean;
    // };
}