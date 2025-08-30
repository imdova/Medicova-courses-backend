import { Entity, Column, OneToMany } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasicEntity } from '../../../common/entities/basic.entity';
import { ProfileSpeciality } from './profile-specaility.entity';

@Entity('profile_categories')
export class ProfileCategory extends BasicEntity {
  @ApiProperty({
    description:
      'User ID of the admin who created the profile-category to be used by instructor',
    format: 'uuid',
  })
  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @ApiProperty({ description: 'Name of the profile category', maxLength: 255 })
  @Column({ length: 255, unique: true })
  name: string;

  @ApiPropertyOptional({ description: 'Category description', maxLength: 500 })
  @Column({ length: 500, nullable: true })
  description?: string;

  @ApiPropertyOptional({ description: 'Slug for SEO-friendly URLs' })
  @Column({ length: 255, unique: true })
  slug: string;

  @ApiPropertyOptional({ description: 'Image URL for category thumbnail' })
  @Column({ length: 500, nullable: true })
  image?: string;

  @OneToMany(() => ProfileSpeciality, (speciality) => speciality.category)
  specialities: ProfileSpeciality[];
}
