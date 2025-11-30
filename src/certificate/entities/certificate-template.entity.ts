import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { Certificate } from './certificate.entity';

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

    @Column()
    fileName: string;

    @Column()
    fileSize: string;

    @Column()
    fileFormat: string; // 'pdf', 'png', 'jpg'

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

    // Relationship with courses that use this template
    @OneToMany(() => Course, course => course.certificateTemplate)
    courses: Course[];
}