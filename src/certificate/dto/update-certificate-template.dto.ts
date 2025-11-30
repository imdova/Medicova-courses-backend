import { TemplateStatus } from "../entities/certificate-template.entity";

export class UpdateCertificateTemplateDto {
    name?: string;
    description?: string;
    status?: TemplateStatus;
    requiredElements?: {
        studentName: boolean;
        courseTitle: boolean;
        completionDate: boolean;
        certificateId: boolean;
        instructorSignature: boolean;
        academyLogo: boolean;
    };
    specifications?: {
        size: string;
        orientation: string;
        safeMargin: string;
        hasQrCode: boolean;
    };
}