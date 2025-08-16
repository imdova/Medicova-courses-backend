import { Entity, Column, OneToMany } from 'typeorm';
import { CourseBundle } from './course-bundle.entity';
import { BundlePricing } from './bundle-pricing.entity';
import { BasicEntity } from '../../common/entities/basic.entity';

export enum BundleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('bundles')
export class Bundle extends BasicEntity {
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail_url?: string;

  @Column({ type: 'boolean', default: false })
  is_free: boolean;

  @Column({ type: 'uuid' })
  created_by: string;

  @Column({ type: 'enum', enum: BundleStatus, default: BundleStatus.DRAFT })
  status: BundleStatus;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => CourseBundle, (courseBundle) => courseBundle.bundle)
  courseBundles: CourseBundle[];

  @OneToMany(() => BundlePricing, (bundlePricing) => bundlePricing.bundle)
  pricings: BundlePricing[];
}
