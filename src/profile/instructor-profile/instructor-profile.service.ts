import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateInstructorProfileDto } from './dto/create-instructor-profile.dto';
import { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { InstructorProfile } from './entities/instructor-profile.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InstructorProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(InstructorProfile)
    private instructorProfileRepository: Repository<InstructorProfile>,
  ) { }

  async createInstructorProfile(
    userId: string,
    createInstructorProfileDto: CreateInstructorProfileDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['instructorProfile'],
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.instructorProfile)
      throw new BadRequestException('User already has a profile');

    let { firstName, lastName, userName, ...rest } = createInstructorProfileDto;

    // ✅ Auto-generate username if not provided
    if (!userName) {
      userName = await this.generateUsername(firstName, lastName);
    } else {
      // Ensure provided username is unique
      const existing = await this.instructorProfileRepository.findOne({
        where: { userName },
      });
      if (existing) {
        throw new BadRequestException('Username already taken');
      }
    }

    const profile = this.instructorProfileRepository.create({
      firstName,
      lastName,
      userName,
      ...rest,
    });

    await this.instructorProfileRepository.save(profile);

    user.instructorProfile = profile;
    await this.userRepository.save(user);

    return profile;
  }

  async updateInstructorProfile(
    userId: string,
    updateInstructorProfileDto: UpdateInstructorProfileDto,
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['instructorProfile'],
    });

    if (!user || !user.instructorProfile) {
      throw new NotFoundException('Profile not found for this user');
    }

    const updatedProfile = Object.assign(
      user.instructorProfile,
      updateInstructorProfileDto,
    );
    await this.instructorProfileRepository.save(updatedProfile);
    return updatedProfile;
  }

  async getInstructorProfileByUserId(userId: string) {
    const profile = await this.instructorProfileRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Profile not found for this user');
    }

    delete profile.user.password;
    return profile; // includes the user
  }

  async deleteInstructorProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['instructorProfile'],
    });

    if (!user || !user.instructorProfile) {
      throw new NotFoundException('Instructor profile not found for this user');
    }

    // Remove relation
    const profileId = user.instructorProfile.id;
    user.instructorProfile = null;
    await this.userRepository.save(user);

    // Delete profile record
    await this.instructorProfileRepository.delete(profileId);

    return { message: 'Instructor profile deleted successfully' };
  }

  private generateUsername(firstName: string, lastName: string): string {
    const base = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, '');
    const uuidPart = uuidv4().split('-')[0]; // take first segment, e.g., "3f8c92"
    return `${base}-${uuidPart}`;
  }
}
