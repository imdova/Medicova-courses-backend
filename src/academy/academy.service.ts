import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Academy } from './entities/academy.entity';
import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { CreateAcademyInstructorDto } from './dto/create-academy-instructor.dto';
import { AcademyInstructor } from './entities/academy-instructors.entity';
import { UserRole } from 'src/user/entities/user.entity';
import { UpdateAcademyInstructorDto } from './dto/update-academy-instructor.dto';

@Injectable()
export class AcademyService {
  constructor(
    @InjectRepository(Academy)
    private academyRepository: Repository<Academy>,
    @InjectRepository(AcademyInstructor)
    private academyInstructorRepository: Repository<AcademyInstructor>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  async create(createAcademyDto: CreateAcademyDto): Promise<Academy> {
    const academy = this.academyRepository.create(createAcademyDto);
    try {
      return await this.academyRepository.save(academy);
    } catch (error) {
      if ((error as any).code === '23505') {
        throw new ConflictException(
          'Academy with this name or slug already exists.',
        );
      }
      throw new InternalServerErrorException('Failed to create academy.');
    }
  }

  findAll() {
    return this.academyRepository.find();
  }

  findOne(id: string) {
    return this.academyRepository.findOne({ where: { id } });
  }

  async findOneBySlug(slug: string): Promise<Academy> {
    const course = await this.academyRepository.findOne({
      where: { slug, deleted_at: null },
    });

    if (!course) throw new NotFoundException('Academy not found');

    return course;
  }

  async update(id: string, updateAcademyDto: UpdateAcademyDto) {
    try {
      await this.academyRepository.update(id, updateAcademyDto);
      return this.findOne(id); // fetch the updated entity
    } catch (error) {
      if ((error as any).code === '23505') {
        throw new ConflictException(
          'Academy with this name or slug already exists.',
        );
      }
      throw new InternalServerErrorException('Failed to update academy.');
    }
  }

  async remove(id: string) {
    const academy = await this.findOne(id);
    if (!academy) return;
    await this.academyRepository.remove(academy);
  }

  async addUserToAcademy(
    academyId: string,
    createUserDto: CreateUserDto,
  ): Promise<{ message: string }> {
    const academy = await this.findOne(academyId);
    if (!academy) throw new NotFoundException('Academy not found');

    // Ensure role is either ACADEMY_USER or ACADEMY_ADMIN or STUDENT
    const role = createUserDto.role;

    // ✅ Only allow 'student' or 'academy_user' roles
    if (
      ![
        UserRole.STUDENT,
        UserRole.ACADEMY_USER,
        UserRole.ACADEMY_ADMIN,
      ].includes(role)
    ) {
      throw new BadRequestException(
        'You can only create users with role "student" or "academy_user" or "academy_admin"',
      );
    }

    // Call UserService.register and link the academy
    await this.userService.register({
      ...createUserDto,
      role,
      academy, // link user to academy
    });

    // ✅ Only return a success message
    return { message: 'User registered successfully' };
  }

  async getUsersInAcademy(academyId: string) {
    const academy = await this.findOne(academyId);
    if (!academy) {
      throw new NotFoundException('Academy not found');
    }

    // Use UserService to fetch users
    return this.userService.findByAcademy(academyId);
  }

  async addTeacherToAcademy(
    academyId: string,
    createAcademyInstructorDto: CreateAcademyInstructorDto,
  ): Promise<{ message: string }> {
    const academy = await this.findOne(academyId);
    if (!academy) throw new NotFoundException('Academy not found');

    const teacher = this.academyInstructorRepository.create({
      ...createAcademyInstructorDto,
      academy,
    });

    await this.academyInstructorRepository.save(teacher);

    return { message: 'Instructor profile created successfully' };
  }

  async findInstructors(academyId: string): Promise<AcademyInstructor[]> {
    return this.academyInstructorRepository.find({
      where: { academy: { id: academyId } },
    });
  }

  async findOneInstructor(
    academyId: string,
    instructorId: string,
  ): Promise<AcademyInstructor> {
    const instructor = await this.academyInstructorRepository.findOne({
      where: {
        id: instructorId,
        academy: { id: academyId },
      },
      relations: ['academy'], // optional, only if you want academy info
    });

    if (!instructor) {
      throw new NotFoundException(
        `Instructor with ID ${instructorId} not found in this academy`,
      );
    }

    return instructor;
  }

  async updateInstructor(
    academyId: string,
    instructorId: string,
    updateAcademyInstructorDto: UpdateAcademyInstructorDto,
  ) {
    const instructor = await this.academyInstructorRepository.findOne({
      where: { id: instructorId, academy: { id: academyId } },
    });

    if (!instructor) {
      throw new NotFoundException('Instructor not found in this academy');
    }

    Object.assign(instructor, updateAcademyInstructorDto);

    return this.academyInstructorRepository.save(instructor);
  }
}
