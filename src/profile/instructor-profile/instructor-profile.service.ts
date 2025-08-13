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

@Injectable()
export class InstructorProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(InstructorProfile)
    private instructorProfileRepository: Repository<InstructorProfile>,
  ) {}
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

    const profile = this.instructorProfileRepository.create(
      createInstructorProfileDto,
    );
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
}
