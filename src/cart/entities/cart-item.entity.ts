import { BasicEntity } from '../../common/entities/basic.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Cart } from './cart.entity';
import { Course } from 'src/course/entities/course.entity';
import { Bundle } from 'src/bundle/entities/bundle.entity';
import { User } from 'src/user/entities/user.entity';

export enum CartItemType {
    COURSE = 'course',
    BUNDLE = 'bundle',
}

@Entity('cart_items')
export class CartItem extends BasicEntity {
    @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'cart_id' })
    cart: Cart;

    @ApiProperty({ description: 'Cart ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'cart_id' })
    cartId: string;

    @ApiProperty({
        description: 'Type of item in cart',
        enum: CartItemType
    })
    @Column({ type: 'enum', enum: CartItemType })
    itemType: CartItemType;

    // Separate columns for each item type
    @ApiPropertyOptional({ description: 'Course ID', format: 'uuid' })
    @Column({ type: 'uuid', nullable: true, name: 'course_id' })
    courseId?: string;

    @ApiPropertyOptional({ description: 'Bundle ID', format: 'uuid' })
    @Column({ type: 'uuid', nullable: true, name: 'bundle_id' })
    bundleId?: string;

    // Creator reference
    @ApiProperty({ description: 'Creator/Instructor ID', format: 'uuid' })
    @Column({ type: 'uuid', name: 'creator_id' })
    creatorId: string;

    // Relationships
    @ApiPropertyOptional({ type: () => Course })
    @ManyToOne(() => Course, { nullable: true })
    @JoinColumn({ name: 'course_id' })
    course?: Course;

    @ApiPropertyOptional({ type: () => Bundle })
    @ManyToOne(() => Bundle, { nullable: true })
    @JoinColumn({ name: 'bundle_id' })
    bundle?: Bundle;

    @ApiPropertyOptional({ type: () => User })
    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'creator_id' })
    creator?: User;

    @ApiProperty({ description: 'Quantity of items', default: 1 })
    @Column({ type: 'int', default: 1 })
    quantity: number;

    @ApiProperty({ description: 'Price per item' })
    @Column({ type: 'float' })
    price: number;

    @ApiProperty({ description: 'Currency code' })
    @Column({ length: 3, name: 'currency_code' })
    currencyCode: string;

    @ApiProperty({ description: 'Item title for display' })
    @Column({ length: 255, name: 'item_title' })
    itemTitle: string;

    @ApiPropertyOptional({ description: 'Item thumbnail URL' })
    @Column({ length: 500, nullable: true, name: 'thumbnail_url' })
    thumbnailUrl?: string;

    // Helper method to get the actual item
    getItem(): Course | Bundle | undefined {
        return this.course || this.bundle;
    }

    // Helper method to get the item ID based on type
    getItemId(): string {
        return this.itemType === CartItemType.COURSE ? this.courseId : this.bundleId;
    }
}