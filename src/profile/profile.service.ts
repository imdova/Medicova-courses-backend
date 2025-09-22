import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { v4 as uuidv4 } from 'uuid';
import { ProfileCategory } from './profile-category/entities/profile-category.entity';
import { ProfileSpeciality } from './profile-category/entities/profile-specaility.entity';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
    @InjectRepository(ProfileCategory)
    private readonly categoryRepository: Repository<ProfileCategory>,
    @InjectRepository(ProfileSpeciality)
    private readonly specialityRepository: Repository<ProfileSpeciality>,
  ) { }

  async createProfile(
    userId: string,
    createProfileDto: CreateProfileDto,
    role?: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.profile)
      throw new BadRequestException('User already has a profile');

    let { firstName, lastName, userName, categoryId, specialityId, ...rest } =
      createProfileDto;

    // ✅ Auto-generate username if not provided
    if (!userName) {
      userName = await this.generateUsername(firstName, lastName);
    } else {
      const existing = await this.profileRepository.findOne({
        where: { userName },
      });
      if (existing) {
        throw new BadRequestException('Username already taken');
      }
    }

    // ✅ Only instructors can have category/speciality
    if (role !== 'instructor') {
      categoryId = null;
      specialityId = null;
    }

    const profile = this.profileRepository.create({
      firstName,
      lastName,
      userName,
      category: categoryId ? { id: categoryId } : null,
      speciality: specialityId ? { id: specialityId } : null,
      ...rest,
    });

    profile.completionPercentage = this.calculateCompletion(profile);

    await this.profileRepository.save(profile);

    user.profile = profile;
    await this.userRepository.save(user);

    return profile;
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
    role?: string,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Profile not found for this user');
    }

    // ✅ Handle username properly
    if (updateProfileDto.userName) {
      const existing = await this.profileRepository.findOne({
        where: { userName: updateProfileDto.userName },
      });
      if (existing && existing.id !== user.profile.id) {
        throw new BadRequestException('Username already taken');
      }
    } else {
      updateProfileDto.userName = user.profile.userName; // keep old one
    }

    // ✅ Only instructors can update category/speciality
    let { categoryId, specialityId, ...rest } = updateProfileDto;
    let category = null;
    let speciality = null;
    if (role === 'instructor') {
      if (categoryId) {
        category = await this.categoryRepository.findOne({ where: { id: categoryId } });
        if (!category) {
          throw new BadRequestException(`Category with id ${categoryId} does not exist`);
        }
      }

      if (specialityId) {
        speciality = await this.specialityRepository.findOne({ where: { id: specialityId } });
        if (!speciality) {
          throw new BadRequestException(`Speciality with id ${specialityId} does not exist`);
        }
      }
    }

    const updatedProfile = Object.assign(user.profile, {
      ...rest,
      userName: updateProfileDto.userName,
      category,
      speciality,
    });

    updatedProfile.completionPercentage = this.calculateCompletion(updatedProfile);

    try {
      return await this.profileRepository.save(updatedProfile);
    } catch (error: any) {
      // Handle unique constraint violations
      if (error.code === '23505') {
        throw new BadRequestException('A profile with this data already exists.');
      }

      // You can handle more error codes here if needed
      console.error('Failed to update profile:', error);
      throw new InternalServerErrorException('Failed to update profile');
    }
  }

  async getProfileByUserId(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'category', 'speciality'],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found for this user');
    }

    delete profile.user.password;
    return profile;
  }

  async deleteProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Profile not found for this user');
    }

    const profileId = user.profile.id;
    user.profile = null;
    await this.userRepository.save(user);

    await this.profileRepository.delete(profileId);

    return { message: 'Profile deleted successfully' };
  }

  private generateUsername(firstName: string, lastName: string): string {
    const base = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, '');
    const uuidPart = uuidv4().split('-')[0];
    return `${base}-${uuidPart}`;
  }

  // ===== Search by profile ID =====
  async findInstructorProfileById(profileId: string) {
    return this.profileRepository.findOne({
      where: { id: profileId },
      relations: ['user'],
    });
  }

  async getInstructorProfileByUsername(userName: string) {
    const profile = await this.profileRepository.findOne({
      where: {
        userName,
        user: { role: { name: 'instructor' } }, // ✅ filter by role name
      },
      relations: ['user', 'category', 'speciality'], // ✅ ensure user is loaded
    });

    if (!profile) {
      throw new NotFoundException('Instructor profile not found');
    }

    if (!profile.isPublic) {
      throw new ForbiddenException('This profile is private');
    }

    return profile;
  }


  async makeAllInstructorProfilesPrivate(): Promise<void> {
    await this.profileRepository
      .createQueryBuilder()
      .update()
      .set({ isPublic: false })
      .where(
        `"user_id" IN (
        SELECT id FROM "user" WHERE role = :role
    )`,
      )
      .setParameter('role', 'instructor')
      .execute();
  }

  private readonly completionFields: (keyof Profile)[] = [
    'firstName',
    'lastName',
    'userName',
    'photoUrl',
    'phoneNumber',
    'dateOfBirth',
    'gender',
    'nationality',
    'maritalStatus',
    'resumePath',
    'contactEmail',
    'linkedinUrl',
    'instagramUrl',
    'twitterUrl',
    'facebookUrl',
    'youtubeUrl',
    'languages',
    'metadata',
    'country',
    'state',
    'city',
  ];

  private calculateCompletion(profile: Partial<Profile>): number {
    let filled = 0;

    for (const field of this.completionFields) {
      const value = profile[field];
      if (Array.isArray(value)) {
        if (value.length > 0) filled++;
      } else if (value && typeof value === 'object') {
        if (Object.keys(value).length > 0) filled++;
      } else if (value !== null && value !== undefined && value !== '') {
        filled++;
      }
    }

    return Math.round((filled / this.completionFields.length) * 100);
  }
}
