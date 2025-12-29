import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Bundle } from './bundle.entity';
import { BasicEntity } from '../../common/entities/basic.entity';

export enum CurrencyCode {
  USD = 'USD',
  EUR = 'EUR',
  EGP = 'EGP',
  SAR = 'SAR',
  // add more as needed
}

@Entity('bundle_pricing')
export class BundlePricing extends BasicEntity {
  @ManyToOne(() => Bundle, (bundle) => bundle.pricings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bundle_id' })
  bundle: Bundle;

  @Index()
  @Column({ name: 'bundle_id', type: 'uuid' })
  bundleId: string;

  @Index()
  @Column({ type: 'enum', enum: CurrencyCode })
  currency_code: CurrencyCode;

  @Column({ type: 'float' })
  regular_price: number;

  @Column({ type: 'float', nullable: true })
  sale_price?: number;

  @Column({ type: 'float', nullable: true })
  discount_amount?: number;

  @Index()
  @Column({ type: 'boolean', default: false })
  discount_enabled: boolean;

  @Index()
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
