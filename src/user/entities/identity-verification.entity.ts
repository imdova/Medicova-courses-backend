import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from './user.entity';

export enum IdentityVerificationStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

@Entity('identity_verifications')
export class IdentityVerification extends BasicEntity {
    @ApiProperty({ description: 'The status of the identity verification submission' })
    @Column({ type: 'enum', enum: IdentityVerificationStatus, default: IdentityVerificationStatus.PENDING })
    status: IdentityVerificationStatus;

    @ApiProperty({ description: 'Array of URLs/paths to the uploaded identity documents', type: [String] })
    @Column('text', { array: true })
    fileUrls: string[];

    @ApiPropertyOptional({ description: 'Optional notes provided by the user during submission' })
    @Column({ nullable: true })
    notes?: string;

    @ApiPropertyOptional({ description: 'Reason for rejection (Admin only)' })
    @Column({ nullable: true, name: 'rejection_reason' })
    rejectionReason?: string;

    // Link back to the user who submitted the verification
    @OneToOne(() => User, (user) => user.identityVerification)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'uuid', name: 'user_id' })
    userId: string;

    // Optional: Track which admin reviewed the submission
    @ManyToOne(() => User, { nullable: true, eager: false })
    @JoinColumn({ name: 'reviewed_by' })
    reviewedBy?: User;
}