import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from 'src/user/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

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
    if (role !== UserRole.INSTRUCTOR) {
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
    if (role !== UserRole.INSTRUCTOR) {
      categoryId = null;
      specialityId = null;
    }

    const updatedProfile = Object.assign(user.profile, {
      ...rest,
      userName: updateProfileDto.userName,
      category: categoryId ? { id: categoryId } : null,
      speciality: specialityId ? { id: specialityId } : null,
    });

    await this.profileRepository.save(updatedProfile);
    return updatedProfile;
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
        user: { role: UserRole.INSTRUCTOR }, // ✅ filter by instructor role
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
      .setParameter('role', UserRole.INSTRUCTOR)
      .execute();
  }
}
