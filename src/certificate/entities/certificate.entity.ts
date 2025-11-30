// entities/certificate.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { CertificateTemplate } from './certificate-template.entity';
import { User } from '../../user/entities/user.entity';
import { Course } from '../../course/entities/course.entity';

@Entity('certificates')
export class Certificate extends BasicEntity {
    @Column({ unique: true })
    certificateId: string;

    @Column()
    studentName: string;

    @Column()
    courseTitle: string;

    @Column({ type: 'timestamp' })
    completionDate: Date;

    @Column({ type: 'timestamp' })
    issuedDate: Date;

    @Column({ nullable: true })
    instructorSignature: string;

    @ManyToOne(() => CertificateTemplate, { eager: true })
    template: CertificateTemplate;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'created_by' })
    createdBy: User;

    @ManyToOne(() => Course, { eager: true })
    course: Course;

    @ManyToOne(() => User, { eager: true })
    student: User;

    @Column({ type: 'jsonb', nullable: true })
    metadata: {
        grade?: string;
        finalScore?: number;
        creditsEarned?: number;
        verificationUrl?: string;
    };
}