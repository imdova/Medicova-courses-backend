import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { ProfileService } from 'src/profile/profile.service';
import { AcademyService } from 'src/academy/academy.service';
import { Course } from 'src/course/entities/course.entity';
import { UpdateSecuritySettingsDto } from './dto/security-settings.dto';
import { Profile } from 'src/profile/entities/profile.entity';
import {
  FilterOperator,
  paginate,
  Paginated,
  PaginateQuery,
} from 'nestjs-paginate';
import { QueryConfig } from 'src/common/utils/query-options';
import { Role } from './entities/roles.entity';
import { v4 as uuidv4 } from 'uuid';
import { IdentityVerification, IdentityVerificationStatus } from './entities/identity-verification.entity';

export const STUDENT_PAGINATION_CONFIG: QueryConfig<User> = {
  sortableColumns: [
    'email',
    'role',
    'created_at',
    'profile.firstName',
    'profile.lastName',
  ],
  defaultSortBy: [['created_at', 'DESC']],
  filterableColumns: {
    email: [FilterOperator.ILIKE],
    role: [FilterOperator.EQ],
    'profile.firstName': [FilterOperator.ILIKE],
    'profile.lastName': [FilterOperator.ILIKE],
  },
  relations: ['profile'], // 👈 ensures TypeORM joins the profile automatically
};

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly profileService: ProfileService,
    private readonly academyService: AcademyService,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(IdentityVerification)
    private identityRepository: Repository<IdentityVerification>,
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) { }

  async register(createUserDto: CreateUserDto): Promise<User> {
    const { password, firstName, lastName, photoUrl, role, email, ...rest } =
      createUserDto;

    const normalizedEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    // Determine role name (default to 'student' if not provided)
    const roleName = createUserDto.role || 'student';

    // Get or create role entity
    let roleEntity = await this.roleRepository.findOne({
      where: { name: roleName },
    });

    // Auto-create common roles if they don't exist
    if (!roleEntity) {
      const commonRoles: Record<string, string> = {
        student: 'Student role for course enrollment',
        instructor: 'Instructor role for teaching courses',
        admin: 'Administrator with full system access',
        academy_admin: 'Academy administrator role',
        academy_user: 'Academy user role',
      };

      const roleDescription = commonRoles[roleName] || `Role: ${roleName}`;

      // Only auto-create if it's a common role
      if (commonRoles[roleName]) {
        roleEntity = this.roleRepository.create({
          name: roleName,
          description: roleDescription,
        });
        roleEntity = await this.roleRepository.save(roleEntity);
      } else {
        throw new NotFoundException(
          `Role "${roleName}" not found. Please ensure the role exists in the database.`,
        );
      }
    }

    const verificationToken = uuidv4();

    const user = this.userRepository.create({
      ...rest,
      email: normalizedEmail,
      password: hashedPassword,
      role: roleEntity,
      emailVerificationToken: verificationToken,
    });

    try {
      const savedUser = await this.userRepository.save(user);
      await this.profileService.createProfile(savedUser.id, {
        firstName: firstName || '',
        lastName: lastName || '',
        photoUrl,
      }, role);

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

    // 🔐 1. Hash password for the user
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // 🎭 2. Get the academy_admin role
    const roleEntity = await this.roleRepository.findOne({
      where: { name: 'academy_admin' },
    });

    if (!roleEntity) {
      throw new NotFoundException('Role academy_admin not found');
    }

    const verificationToken = uuidv4();

    // 👤 3. Create the user first (without academy yet)
    const user = this.userRepository.create({
      ...userData,
      email: normalizedEmail,
      password: hashedPassword,
      role: roleEntity,
      emailVerificationToken: verificationToken,
    });

    const savedUser = await this.userRepository.save(user);

    // 🏫 4. Create the academy and link created_by to the new user
    const newAcademy = await this.academyService.create(academyDto, savedUser.id, savedUser.email);

    // 🔗 5. Associate academy to the user and save
    savedUser.academy = newAcademy;
    await this.userRepository.save(savedUser);

    // 👩‍🏫 6. Create instructor profile
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

    const updatePayload: any = { ...updateUserDto };

    // If role is provided, fetch role entity
    if (updateUserDto.role) {
      const roleEntity = await this.roleRepository.findOne({
        where: { name: updateUserDto.role },
      });

      if (!roleEntity) {
        throw new NotFoundException(`Role ${updateUserDto.role} not found`);
      }
      updatePayload.role = roleEntity; // ✅ convert string to Role entity
    }

    await this.userRepository.update(userId, updatePayload);
    return this.findOne(userId);
  }

  async remove(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }
    await this.userRepository.softDelete(userId);
  }

  async findByAcademy(academyId: string) {
    return this.userRepository.find({
      where: { academy: { id: academyId } },
    });
  }

  async findStudentsByInstructor(
    query: PaginateQuery,
    instructorId: string,
  ): Promise<Paginated<any>> {
    const qb = this.userRepository
      .createQueryBuilder('student')
      .innerJoin('student.enrollments', 'enrollment')
      .innerJoin('enrollment.course', 'course')
      .leftJoinAndSelect('student.profile', 'profile')
      .leftJoinAndSelect('profile.category', 'category')
      .leftJoinAndSelect('profile.speciality', 'speciality')
      .where('course.createdBy = :instructorId', { instructorId })
      .loadRelationCountAndMap(
        'student.numberOfCourses',
        'student.enrollments',
        'enrollmentAlias',
        (qb) =>
          qb.innerJoin('enrollmentAlias.course', 'courseAlias')
            .where('courseAlias.createdBy = :instructorId', { instructorId })
      );

    const result = await paginate<any>(query, qb, STUDENT_PAGINATION_CONFIG);

    result.data = result.data.map(
      (student: User & { numberOfCourses?: number }) => {
        // Calculate age from date of birth
        const age = student.profile?.dateOfBirth
          ? this.calculateAge(student.profile.dateOfBirth)
          : null;

        // Get earliest enrollment date for this instructor's courses
        const enrollmentDate = student.enrollments
          ?.filter(e => e.course?.createdBy === instructorId)
          ?.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]
          ?.created_at ?? null;

        return {
          id: student.id,
          email: student.email,
          role: student.role,
          numberOfCourses: student.numberOfCourses ?? 0,
          enrollmentDate,
          profile: {
            firstName: student.profile?.firstName ?? null,
            lastName: student.profile?.lastName ?? null,
            name: student.profile?.firstName && student.profile?.lastName
              ? `${student.profile.firstName} ${student.profile.lastName}`
              : student.profile?.firstName ?? student.profile?.lastName ?? null,
            photoUrl: student.profile?.photoUrl ?? null,
            phoneNumber: student.profile?.phoneNumber ?? null,
            country: student.profile?.country ?? null,
            state: student.profile?.state ?? null,
            age,
            gender: student.profile?.gender ?? null,
          },
        };
      },
    );

    return result;
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
      const normalizedEmail = dto.email.trim().toLowerCase();

      // check if another user already has this email
      const existingUser = await this.userRepository.findOne({
        where: { email: normalizedEmail },
      });

      if (existingUser && existingUser.id !== user.id) {
        throw new BadRequestException('Updated Email is already in use');
      }

      user.email = normalizedEmail;
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

  async verifyEmail(token: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired verification token');
    }

    // 1. Set email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null; // clear token

    // 2. 🟢 Update overall verification status
    // isVerified should be true ONLY if both email and identity are verified.
    user.isVerified = user.isEmailVerified && user.isIdentityVerified;

    return this.userRepository.save(user);
  }

  async resendVerificationEmail(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.emailVerificationToken) {
      user.emailVerificationToken = uuidv4();
      await this.userRepository.save(user);
    }

    return user;
  }

  // Helper method to calculate age from date of birth
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Allows a user to submit identity documents for verification.
   * Creates a new PENDING IdentityVerification record.
   */
  async submitIdentity(
    userId: string,
    fileUrls: string[],
    notes?: string,
  ): Promise<IdentityVerification> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Check if an existing PENDING submission exists
    const existingSubmission = await this.identityRepository.findOne({
      where: { userId, status: IdentityVerificationStatus.PENDING },
    });

    if (existingSubmission) {
      throw new BadRequestException(
        'An identity verification submission is already pending review.',
      );
    }

    // Create new submission
    const submission = this.identityRepository.create({
      userId,
      fileUrls,
      notes,
      status: IdentityVerificationStatus.PENDING,
    });

    // Save the submission
    return this.identityRepository.save(submission);
  }
}
