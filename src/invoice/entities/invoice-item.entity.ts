import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';
import { BasicEntity } from '../../common/entities/basic.entity';
import { Course } from 'src/course/entities/course.entity';
import { Bundle } from 'src/bundle/entities/bundle.entity';
import { User } from 'src/user/entities/user.entity';

export enum InvoiceItemType {
    COURSE = 'course',
    BUNDLE = 'bundle',
}

@Entity('invoice_items')
export class InvoiceItem extends BasicEntity {
    @ManyToOne(() => Invoice, (invoice) => invoice.items, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'invoice_id' })
    invoice: Invoice;

    @Column({ type: 'uuid', name: 'invoice_id' })
    invoiceId: string;

    @Column({ type: 'enum', enum: InvoiceItemType })
    itemType: InvoiceItemType;

    // separate IDs (like cart)
    @Column({ type: 'uuid', nullable: true, name: 'course_id' })
    courseId?: string;

    @Column({ type: 'uuid', nullable: true, name: 'bundle_id' })
    bundleId?: string;

    @Column({ type: 'uuid', name: 'creator_id' })
    creatorId: string;

    // Snapshot fields
    @Column({ type: 'varchar', length: 255, name: 'item_title' })
    itemTitle: string;

    @Column({ type: 'float' })
    price: number;

    @Column({ type: 'int', default: 1 })
    quantity: number;

    @Column({ type: 'varchar', length: 3, name: 'currency_code' })
    currencyCode: string;

    @Column({ type: 'varchar', length: 500, nullable: true, name: 'thumbnail_url' })
    thumbnailUrl?: string;

    // Relations
    @ManyToOne(() => Course, { nullable: true })
    @JoinColumn({ name: 'course_id' })
    course?: Course;

    @ManyToOne(() => Bundle, { nullable: true })
    @JoinColumn({ name: 'bundle_id' })
    bundle?: Bundle;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'creator_id' })
    creator?: User;

    getItemId(): string {
        return this.itemType === InvoiceItemType.COURSE ? this.courseId : this.bundleId;
    }
}
