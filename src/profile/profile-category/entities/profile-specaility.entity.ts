import { Column, Entity, ManyToOne } from 'typeorm';
import { BasicEntity } from '../../../common/entities/basic.entity';
import { ApiProperty } from '@nestjs/swagger';
import { ProfileCategory } from './profile-category.entity';

@Entity('profile_specialities')
export class ProfileSpeciality extends BasicEntity {
  @ApiProperty({
    description: 'Name of the speciality',
    example: 'Frontend Development',
  })
  @Column({ length: 255, unique: true })
  name: string;

  @ManyToOne(() => ProfileCategory, (category) => category.specialities, {
    onDelete: 'CASCADE',
  })
  category: ProfileCategory;
}
