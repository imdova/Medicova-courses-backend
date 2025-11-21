import { Entity, Column, OneToMany, JoinColumn, ManyToOne } from 'typeorm';
import { CourseBundle } from './course-bundle.entity';
import { BundlePricing } from './bundle-pricing.entity';
import { BasicEntity } from '../../common/entities/basic.entity';
import { Academy } from 'src/academy/entities/academy.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity';

export enum BundleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('bundles')
export class Bundle extends BasicEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'Slug for SEO-friendly URLs' })
  @Column({ length: 255, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url?: string;

  @Column({ type: 'boolean', default: false })
  is_free: boolean;

  @Column({ type: 'uuid' })
  created_by: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by' })
  instructor: User;

  @Column({ type: 'enum', enum: BundleStatus, default: BundleStatus.DRAFT })
  status: BundleStatus;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => CourseBundle, (courseBundle) => courseBundle.bundle)
  courseBundles: CourseBundle[];

  @OneToMany(() => BundlePricing, (bundlePricing) => bundlePricing.bundle)
  pricings: BundlePricing[];

  @ManyToOne(() => Academy, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'academy_id' })
  academy: Academy;

  @ApiPropertyOptional({
    description: 'Number of purchases for the bundle',
    example: 4,
  })
  @Column({ type: 'int', default: 0, name: 'number_of_purchases' })
  number_of_purchases: number;

  @ApiPropertyOptional({
    description: 'revenue generated from the bundle',
    example: 200.5,
  })
  @Column({ type: 'float', default: 0, name: 'revenue' })
  revenue: number;
}
