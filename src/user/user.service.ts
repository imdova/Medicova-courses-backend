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
import { EmailService } from '../common/email.service';
import { randomBytes } from 'crypto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ProfileService } from 'src/profile/profile.service';
import { AcademyService } from 'src/academy/academy.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private tokenRepository: Repository<PasswordResetToken>,
    private readonly emailService: EmailService,
    private readonly profileService: ProfileService,
    private readonly academyService: AcademyService,
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
      role,
      ...userData
    } = createUserDto;

    if (!academyDto) {
      throw new BadRequestException('Academy data is required');
    }

    // 1. Create the academy via AcademyService
    const newAcademy = await this.academyService.create(academyDto);

    // 2. Hash password for the user
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // 3. Create user and link to academy
    const user = this.userRepository.create({
      ...userData,
      password: hashedPassword,
      role: role || UserRole.ACCOUNT_ADMIN,
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
    const user = await this.userRepository.findOne({ where: { id: userId } });
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

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('No user found with the provided email.');
    }

    const token = randomBytes(3).toString('hex'); // e.g., "a1b2c3" — 6-character code

    await this.tokenRepository.save({
      email: user.email,
      token,
    });

    await this.emailService.sendEmail({
      from: process.env.SMTP_DEMO_EMAIL,
      to: user.email,
      subject: 'Reset Your Password',
      template: 'password-reset',
      context: {
        user: user.email,
        code: token,
      },
    });

    return { message: 'A reset code has been sent to your email.' };
  }

  async verifyResetToken(token: string): Promise<{ message: string }> {
    const tokenEntry = await this.tokenRepository.findOne({ where: { token } });

    if (!tokenEntry) {
      throw new NotFoundException('Invalid or expired token.');
    }

    const isExpired =
      Date.now() - new Date(tokenEntry.created_at).getTime() >
      24 * 60 * 60 * 1000;

    if (isExpired) {
      await this.tokenRepository.delete({ token });
      throw new BadRequestException('Token has expired.');
    }

    return { message: 'Token is valid.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match.');
    }

    const tokenEntry = await this.tokenRepository.findOne({ where: { token } });

    if (!tokenEntry) {
      throw new NotFoundException('Invalid or expired reset token.');
    }

    const isExpired =
      Date.now() - new Date(tokenEntry.created_at).getTime() >
      24 * 60 * 60 * 1000;

    if (isExpired) {
      await this.tokenRepository.delete({ token });
      throw new BadRequestException('Reset token has expired.');
    }

    const { email } = tokenEntry;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User associated with this token not found.');
    }

    // Check if new password is same as old one
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException(
        'New password cannot be the same as the old password.',
      );
    }

    user.password = await this.hashPassword(newPassword);
    await this.userRepository.save(user);
    await this.tokenRepository.delete({ token });

    return { message: 'Password has been successfully reset.' };
  }

  private async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 10);
  }
}
