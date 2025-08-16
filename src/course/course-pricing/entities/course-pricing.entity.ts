import { BasicEntity } from '../../../common/entities/basic.entity';
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Course } from '../../entities/course.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum CurrencyCode {
  EGP = 'EGP',
  SAR = 'SAR',
  USD = 'USD',
  // add other supported currencies here
}

@Entity('course_pricing')
export class CoursePricing extends BasicEntity {
  @ApiProperty({ type: () => Course, description: 'Associated course' })
  @ManyToOne(() => Course, (course) => course.pricings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @ApiProperty({ enum: CurrencyCode, description: 'Currency code' })
  @Column({ type: 'enum', enum: CurrencyCode })
  currencyCode: CurrencyCode;

  @ApiProperty({ type: Number, description: 'Regular price' })
  @Column({ type: 'float' })
  regularPrice: number;

  @ApiProperty({
    type: Number,
    description: 'Sale price',
    required: false,
    nullable: true,
  })
  @Column({ type: 'float', nullable: true })
  salePrice?: number;

  @ApiProperty({
    type: Number,
    description: 'Discount amount',
    required: false,
    nullable: true,
  })
  @Column({ type: 'float', nullable: true })
  discountAmount?: number;

  @ApiProperty({ type: Boolean, description: 'Whether discount is enabled' })
  @Column({ default: false })
  discountEnabled: boolean;

  @ApiProperty({ type: Boolean, description: 'Whether this pricing is active' })
  @Column({ default: true })
  isActive: boolean;
}
