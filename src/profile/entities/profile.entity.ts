import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  Unique,
  ManyToOne,
} from 'typeorm';
import { BasicEntity } from '../../common/entities/basic.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileMetadataDto } from '../dto/profile-metadata.dto';
import { ProfileCategory } from '../profile-category/entities/profile-category.entity';
import { ProfileSpeciality } from '../profile-category/entities/profile-specaility.entity';
import { CountryOrStateDTO } from '../dto/country-state.dto';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
}

@Entity('profile')
@Unique(['user']) // Enforces only one profile per user
export class Profile extends BasicEntity {
  @OneToOne(() => User, (user) => user.profile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ example: 'Mohamed', description: 'First name' })
  @Column({ name: 'first_name', nullable: false })
  firstName: string;

  @ApiProperty({ example: 'Sayed', description: 'Last name' })
  @Column({ name: 'last_name', nullable: false })
  lastName: string;

  @ApiProperty({ example: 'mohamed.sayed', description: 'Unique username' })
  @Column({ name: 'user_name', unique: true })
  userName: string;

  @ApiPropertyOptional({
    example: '/uploads/photo.jpg',
    description: 'Profile photo URL',
  })
  @Column({ name: 'photo_url', nullable: true })
  photoUrl?: string;

  @ApiProperty({ example: '+20100234567', description: 'Phone number' })
  @Column({ name: 'phone_number', nullable: true })
  phoneNumber?: string;

  @ApiProperty({ example: true, description: 'Is WhatsApp number' })
  @Column({ name: 'is_whatsapp', default: false })
  hasWhatsapp: boolean;

  @ApiProperty({ example: '+20100234567', description: 'Phone number' })
  @Column({ name: 'phone_number_whatsapp', nullable: true })
  phoneNumbertForWhatsapp?: string;

  @ApiProperty({ example: '1980-05-20', description: 'Date of birth' })
  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth?: Date;

  @ApiProperty({ enum: Gender, example: Gender.MALE })
  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender?: Gender;

  @ApiProperty({ example: 'Egyptian', description: 'Nationality' })
  @Column({ nullable: true })
  nationality?: string;

  @ApiProperty({ enum: MaritalStatus, example: MaritalStatus.MARRIED })
  @Column({ type: 'enum', enum: MaritalStatus, nullable: true })
  maritalStatus?: MaritalStatus;

  @ApiProperty({ example: true, description: 'Has a driving license' })
  @Column({ name: 'has_driving_license', default: false })
  hasDrivingLicense: boolean;

  @ApiProperty({ example: 'resume.pdf', description: 'Resume file path' })
  @Column({ name: 'resume_path', nullable: true })
  resumePath?: string;

  @ApiProperty({
    example: 'dr.mohamed@example.com',
    description: 'Contact email',
  })
  @Column({ name: 'contact_email', nullable: true })
  contactEmail?: string;

  @ApiProperty({
    example: 'https://linkedin.com/in/mohamed',
    description: 'LinkedIn profile URL',
  })
  @Column({ name: 'linkedin_url', nullable: true })
  linkedinUrl?: string;

  @ApiProperty({
    example: 'Arabic: intermediate, English: intermediate',
    description: 'Languages and proficiency',
  })
  @Column({ type: 'jsonb', nullable: true })
  languages?: { language: string; level: string }[];

  @ApiProperty({
    description: 'Instructor additional structured info',
    type: () => ProfileMetadataDto,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: ProfileMetadataDto;

  @ApiProperty({
    example: true,
    description: 'Indicates whether the profile is public or private',
  })
  @Column({ name: 'is_public', default: false })
  isPublic: boolean;

  @ApiPropertyOptional({
    description: 'The main category this profile belongs to',
    type: () => ProfileCategory,
  })
  @ManyToOne(() => ProfileCategory, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: ProfileCategory | null;

  @ApiPropertyOptional({
    description: 'The main speciality this profile belongs to',
    type: () => ProfileSpeciality,
  })
  @ManyToOne(() => ProfileSpeciality, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'speciality_id' })
  speciality?: ProfileSpeciality | null;

  @ApiProperty({
    type: () => CountryOrStateDTO,
    description: 'Country of residence (optional)',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  country?: CountryOrStateDTO;

  @ApiProperty({
    type: () => CountryOrStateDTO,
    description: 'State of residence (optional)',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  state?: CountryOrStateDTO;

  @ApiProperty({
    type: String,
    description: 'City of residence (optional)',
    maxLength: 100,
    required: false,
  })
  @Column({ type: 'varchar', length: 100, nullable: true })
  city?: string;
}
