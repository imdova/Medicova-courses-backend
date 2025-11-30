import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { CertificateTemplate } from './certificate-template.entity';
import { User } from '../../user/entities/user.entity';

export enum AuditAction {
    TEMPLATE_CREATED = 'template_created',
    TEMPLATE_UPDATED = 'template_updated',
    TEMPLATE_ARCHIVED = 'template_archived',
    TEMPLATE_PUBLISHED = 'template_published',
    CERTIFICATE_ISSUED = 'certificate_issued'
}

@Entity('certificate_audit_trails')
export class CertificateAuditTrail extends BasicEntity {
    @Column({
        type: 'enum',
        enum: AuditAction
    })
    action: AuditAction;

    @Column()
    description: string;

    @ManyToOne(() => CertificateTemplate, { nullable: true, eager: true })
    template: CertificateTemplate;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;
}