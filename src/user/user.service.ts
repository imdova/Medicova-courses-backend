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

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly profileService: ProfileService,
    private readonly academyService: AcademyService,
  ) { }

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
}
