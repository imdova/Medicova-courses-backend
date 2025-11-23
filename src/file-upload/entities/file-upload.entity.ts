import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { User } from '../../user/entities/user.entity';

@Entity('fileUploads')
export class FileUpload extends BasicEntity {
    @Column()
    filename: string;

    @Column()
    originalName: string;

    @Column()
    mimeType: string;

    @Column()
    size: number;

    @Column()
    url: string;

    @Column()
    bucket: string;

    @Column({ nullable: true })
    path: string;

    @ManyToOne(() => User, (user) => user.fileUploads)
    @JoinColumn({ name: 'created_by' }) // 🆕 Map to created_by column
    uploadedBy: User;

    @Column({ type: 'uuid', name: 'created_by' }) // 🆕 Use created_by column name
    createdBy: string;
}