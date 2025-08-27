import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { ProfileService } from 'src/profile/profile.service';
import { AcademyService } from 'src/academy/academy.service';
import { Course } from 'src/course/entities/course.entity';
import { UpdateSecuritySettingsDto } from './dto/security-settings.dto';
import { Profile } from 'src/profile/entities/profile.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly profileService: ProfileService,
    private readonly academyService: AcademyService,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<User> {
    const { password, firstName, lastName, photoUrl, role, email, ...rest } =
      createUserDto;

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = this.userRepository.create({
      ...rest,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || UserRole.STUDENT,
    });

    try {
      const savedUser = await this.userRepository.save(user);
      await this.profileService.createProfile(savedUser.id, {
        firstName: firstName || '',
        lastName: lastName || '',
        photoUrl,
      });

      return savedUser;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).code === '23505'
      ) {
        const detail = (error as any).detail.toLowerCase();
        if (detail.includes('email')) {
          throw new ConflictException('Email is already in use.');
        }
        throw new ConflictException('User already exists.');
      }

      throw new InternalServerErrorException('Failed to create user.');
    }
  }

  async registerWithAcademy(createUserDto: CreateUserDto): Promise<User> {
    const {
      academy: academyDto,
      firstName,
      lastName,
      photoUrl,
      email,
      ...userData
    } = createUserDto;

    if (!academyDto) {
      throw new BadRequestException('Academy data is required');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Create the academy via AcademyService
    const newAcademy = await this.academyService.create(academyDto);

    // 2. Hash password for the user
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // 3. Create user and link to academy
    const user = this.userRepository.create({
      ...userData,
      email: normalizedEmail,
      password: hashedPassword,
      role: UserRole.ACADEMY_ADMIN,
      academy: newAcademy, // link user to academy
    });

    const savedUser = await this.userRepository.save(user);

    // 4. Create instructor profile
    await this.profileService.createProfile(savedUser.id, {
      firstName: firstName || '',
      lastName: lastName || '',
      photoUrl,
    });

    return savedUser;
  }

  findAll() {
    return this.userRepository.find();
  }

  async findOne(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy'],
    });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    return user;
  }

  async update(userId: string, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    await this.userRepository.update(userId, updateUserDto);
    return this.findOne(userId);
  }

  async remove(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    await this.userRepository.remove(user);
  }

  async findByAcademy(academyId: string) {
    return this.userRepository.find({
      where: { academy: { id: academyId } },
    });
  }

  async findStudentsByInstructor(instructorId: string): Promise<any[]> {
    const qb = this.courseRepository
      .createQueryBuilder('course')
      .innerJoin('course.enrollments', 'enrollment')
      .innerJoin('enrollment.student', 'student')
      .leftJoinAndSelect('student.profile', 'profile')
      .leftJoin('student.enrollments', 'studentEnrollments')
      .where('course.createdBy = :instructorId', { instructorId })
      .select([
        'student.id AS "id"',
        'student.email AS "email"',
        'student.role AS "role"',
        'profile.firstName AS "firstName"',
        'profile.lastName AS "lastName"',
        'profile.photoUrl AS "photoUrl"',
        'COALESCE(COUNT(DISTINCT studentEnrollments.course_id), 0) AS "numberOfCourses"', // ✅ fixed
      ])
      .groupBy('student.id')
      .addGroupBy('profile.id');

    const rawStudents = await qb.getRawMany();

    return rawStudents.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      profile: {
        firstName: row.firstName,
        lastName: row.lastName,
        photoUrl: row.photoUrl,
      },
      numberOfCourses: Number(row.numberOfCourses) || 0,
    }));
  }

  async updateSecuritySettings(
    userId: string,
    dto: UpdateSecuritySettingsDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ✅ Update email
    if (dto.email) {
      user.email = dto.email.trim().toLowerCase();
    }

    // ✅ Update phone (via profile)
    if (dto.phoneNumber) {
      if (!user.profile) {
        throw new NotFoundException('Profile not found for user');
      }
      user.profile.phoneNumber = dto.phoneNumber;
    }

    // ✅ Update password
    if (dto.currentPassword || dto.newPassword || dto.confirmNewPassword) {
      if (!dto.currentPassword || !dto.newPassword || !dto.confirmNewPassword) {
        throw new BadRequestException(
          'Current password, new password, and confirm password are all required',
        );
      }

      const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isMatch) {
        throw new BadRequestException('Current password is incorrect');
      }

      if (dto.newPassword !== dto.confirmNewPassword) {
        throw new BadRequestException('New passwords do not match');
      }

      user.password = await bcrypt.hash(dto.newPassword, 10);
    }

    // Save both User and Profile
    await this.userRepository.save(user);
    if (user.profile) {
      await this.profileRepository.save(user.profile); // ✅ save directly
    }

    return user;
  }
}
