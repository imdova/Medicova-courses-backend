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
import { In, Repository } from 'typeorm';
import { Academy } from './entities/academy.entity';
import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { CreateAcademyInstructorDto } from './dto/create-academy-instructor.dto';
import { AcademyInstructor } from './entities/academy-instructors.entity';
import { UpdateAcademyInstructorDto } from './dto/update-academy-instructor.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class AcademyService {
  constructor(
    @InjectRepository(Academy)
    private academyRepository: Repository<Academy>,
    @InjectRepository(AcademyInstructor)
    private academyInstructorRepository: Repository<AcademyInstructor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) { }

  async create(createAcademyDto: CreateAcademyDto, userId: string): Promise<Academy> {
    const academy = this.academyRepository.create({
      ...createAcademyDto,
      created_by: userId, // automatically set the creator
    });
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

  async findAll(): Promise<any[]> {
    // 1) load academies and instructors in one query
    const academies = await this.academyRepository.find({
      relations: ['instructors'],
    });

    if (academies.length === 0) return [];

    // 2) collect unique creator ids and academy ids
    const createdByIds = Array.from(
      new Set(academies.map((a) => a.created_by).filter(Boolean)),
    );

    const academyIds = academies.map((a) => a.id);

    // 3) fetch creators in one query (profile + role)
    const creators = await this.userRepository.find({
      where: { id: In(createdByIds) },
      relations: ['profile', 'role'],
    });

    const creatorsById = new Map(creators.map((c) => [c.id, c]));

    // 4) fetch students counts grouped by academy in one query
    // Note: adjust 'academyId' property name if your DB column is named differently (e.g., 'academy_id').
    const studentCountsRaw = await this.userRepository
      .createQueryBuilder('user')
      .select('user.academyId', 'academyId')
      .addSelect('COUNT(user.id)', 'count')
      .innerJoin('user.role', 'role', 'role.name = :studentRole', {
        studentRole: 'student',
      })
      .where('user.academyId IN (:...academyIds)', { academyIds })
      .groupBy('user.academyId')
      .getRawMany();

    const studentsCountMap = new Map(
      studentCountsRaw.map((r) => [r.academyId as string, Number(r.count)]),
    );

    // 5) merge results
    const result = academies.map((academy) => {
      const creator = creatorsById.get(academy.created_by);

      const createdBy = creator
        ? {
          id: creator.id,
          name: `${creator.profile?.firstName || ''} ${creator.profile?.lastName || ''}`.trim(),
          photo: creator.profile?.photoUrl || null,
          role: creator.role?.name || null,
        }
        : null;

      const instructors = (academy.instructors || []).map((inst) => ({
        id: inst.id,
        name: inst.name,
        title: inst.biography ? inst.biography.split('\n')[0] : null, // or any title logic
        photo: inst.photoUrl || null,
        rate: undefined, // if you don't store rate, keep undefined or compute externally
        bio: inst.biography || null,
      }));

      const studentsCount = studentsCountMap.get(academy.id) || 0;

      // clone academy but remove sensitive or circular relations as needed
      const {
        // remove fields you don't want in response (example)
        // instructors: _instructors,
        // users: _users,
        ...academyPlain
      } = academy as any;

      return {
        ...academyPlain,
        createdBy,
        instructors,
        studentsCount,
      };
    });

    return result;
  }

  async findOne(id: string): Promise<any> {
    const academy = await this.academyRepository.findOne({
      where: { id },
      relations: ['instructors'],
    });

    if (!academy) throw new NotFoundException('Academy not found');

    const creator = await this.userRepository.findOne({
      where: { id: academy.created_by },
      relations: ['profile', 'role'],
    });

    const studentsCount = await this.userRepository.count({
      where: {
        academy: { id: academy.id },
        role: { name: 'student' },
      },
      relations: ['role'],
    });

    return {
      ...academy,
      createdBy: creator
        ? {
          id: creator.id,
          name: `${creator.profile?.firstName || ''} ${creator.profile?.lastName || ''}`.trim(),
          photo: creator.profile?.photoUrl || null,
          role: creator.role?.name || null,
        }
        : null,
      instructors: academy.instructors?.map((inst) => ({
        id: inst.id,
        name: inst.name,
        title: inst.biography ? inst.biography.slice(0, 40) + '...' : '',
        photo: inst.photoUrl || null,
        bio: inst.biography || null,
      })) || [],
      studentsCount,
    };
  }

  async findOneBySlug(slug: string): Promise<any> {
    const academy = await this.academyRepository.findOne({
      where: { slug, deleted_at: null },
      relations: ['instructors'],
    });

    if (!academy) throw new NotFoundException('Academy not found');

    const creator = await this.userRepository.findOne({
      where: { id: academy.created_by },
      relations: ['profile', 'role'],
    });

    const studentsCount = await this.userRepository.count({
      where: {
        academy: { id: academy.id },
        role: { name: 'student' },
      },
      relations: ['role'],
    });

    return {
      ...academy,
      createdBy: creator
        ? {
          id: creator.id,
          name: `${creator.profile?.firstName || ''} ${creator.profile?.lastName || ''}`.trim(),
          photo: creator.profile?.photoUrl || null,
          role: creator.role?.name || null,
        }
        : null,
      instructors: academy.instructors?.map((inst) => ({
        id: inst.id,
        name: inst.name,
        title: inst.biography ? inst.biography.slice(0, 40) + '...' : '',
        photo: inst.photoUrl || null,
        bio: inst.biography || null,
      })) || [],
      studentsCount,
    };
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
        'student',
        'academy_user',
        'academy_admin',
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
  ): Promise<any> {
    const academy = await this.findOne(academyId);
    if (!academy) throw new NotFoundException('Academy not found');

    const teacher = this.academyInstructorRepository.create({
      ...createAcademyInstructorDto,
      academy,
    });

    const createdTeacher = await this.academyInstructorRepository.save(teacher);

    // Optionally remove academy relation before returning
    const { academy: _, ...data } = createdTeacher;

    return { message: 'Instructor profile created successfully', data };
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
