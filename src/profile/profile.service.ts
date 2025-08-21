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
import { User } from 'src/user/entities/user.entity';
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

  async createProfile(userId: string, createProfileDto: CreateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.profile)
      throw new BadRequestException('User already has a profile');

    let { firstName, lastName, userName, ...rest } = createProfileDto;

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

    const profile = this.profileRepository.create({
      firstName,
      lastName,
      userName,
      ...rest,
    });

    await this.profileRepository.save(profile);

    user.profile = profile;
    await this.userRepository.save(user);

    return profile;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Profile not found for this user');
    }

    if (!updateProfileDto.userName) {
      updateProfileDto.userName = await this.generateUsername(
        updateProfileDto.firstName,
        updateProfileDto.lastName,
      );
    } else {
      const existing = await this.profileRepository.findOne({
        where: { userName: updateProfileDto.userName },
      });
      if (existing) {
        throw new BadRequestException('Username already taken');
      }
    }

    const updatedProfile = Object.assign(user.profile, updateProfileDto);
    await this.profileRepository.save(updatedProfile);
    return updatedProfile;
  }

  async getProfileByUserId(userId: string) {
    const profile = await this.profileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
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
      where: { userName },
    });

    if (!profile) {
      throw new NotFoundException('Instructor profile not found');
    }

    if (!profile.isPublic) {
      throw new ForbiddenException('This profile is private');
    }

    return profile;
  }

  async makeAllProfilesPrivate(): Promise<void> {
    await this.profileRepository.update({}, { isPublic: false });
  }
}
