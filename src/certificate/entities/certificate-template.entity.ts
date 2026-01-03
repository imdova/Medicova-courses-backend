import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Certificate } from './certificate.entity';
import { FileUpload } from '../../file-upload/entities/file-upload.entity'; // Add this

export enum TemplateStatus {
    DRAFT = 'draft',
    ACTIVE = 'active',
    ARCHIVED = 'archived'
}

export enum TemplateType {
    CONTINUING_EDUCATION = 'continuing_education',
    INSTRUCTOR_RECOGNITION = 'instructor_recognition',
    GENERAL_COMPLETION = 'general_completion',
    ADVANCED_WORKSHOP = 'advanced_workshop'
}

@Entity('certificate_templates')
export class CertificateTemplate extends BasicEntity {
    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: TemplateStatus,
        default: TemplateStatus.DRAFT
    })
    status: TemplateStatus;

    @Column({
        type: 'enum',
        enum: TemplateType
    })
    type: TemplateType;

    @ManyToOne(() => FileUpload, { eager: true, onDelete: 'SET NULL' }) // Add this
    @JoinColumn({ name: 'file_id' })
    file: FileUpload;

    @Column({ default: 0 })
    certificatesIssued: number;

    @Column({ type: 'jsonb', nullable: true })
    requiredElements?: {
        studentName: boolean;
        courseTitle: boolean;
        completionDate: boolean;
        certificateId: boolean;
        instructorSignature: boolean;
        academyLogo: boolean;
    };

    @Column({ type: 'jsonb', nullable: true })
    specifications?: {
        size: string;
        orientation: string;
        safeMargin: string;
        hasQrCode: boolean;
    };

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @Column({ type: 'timestamp', nullable: true })
    archivedAt: Date;

    @OneToMany(() => Certificate, certificate => certificate.template)
    certificates: Certificate[];

    @OneToMany(() => Course, course => course.certificateTemplate)
    courses: Course[];

    // Virtual properties
    get downloadUrl(): string {
        return `${process.env.API_URL}/certificate-templates/${this.id}/download`;
    }

    get previewUrl(): string {
        return `${process.env.API_URL}/certificate-templates/${this.id}/preview`;
    }

    get fileUrl(): string | null {
        return this.file?.url || null;
    }

    get fileName(): string | null {
        return this.file?.originalName || null;
    }

    get fileSize(): string | null {
        return this.file ? this.formatFileSize(this.file.size) : null;
    }

    get fileFormat(): string | null {
        return this.file?.mimeType?.split('/')[1] || null;
    }

    private formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}