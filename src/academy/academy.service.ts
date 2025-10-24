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
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { CreateAcademyKeywordDto } from './dto/create-academy-keyword.dto';
import { AcademyKeyword } from './entities/academy-keywords.entity';

@Injectable()
export class AcademyService {
  constructor(
    @InjectRepository(Academy)
    private academyRepository: Repository<Academy>,
    @InjectRepository(AcademyInstructor)
    private academyInstructorRepository: Repository<AcademyInstructor>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CourseStudent)
    private readonly courseStudentRepository: Repository<CourseStudent>,
    @InjectRepository(AcademyKeyword)
    private readonly academyKeywordRepository: Repository<AcademyKeyword>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) { }

  async create(createAcademyDto: CreateAcademyDto, userId: string, email: string): Promise<Academy> {
    const { keyWords = [] } = createAcademyDto;

    // Validate keywords
    if (keyWords.length > 0) {
      const foundKeywords = await this.academyKeywordRepository
        .createQueryBuilder('kw')
        .where('kw.name IN (:...keyWords)', { keyWords })
        .getMany();

      const foundNames = foundKeywords.map(k => k.name);
      const invalidKeywords = keyWords.filter(k => !foundNames.includes(k));

      if (invalidKeywords.length > 0) {
        throw new BadRequestException(
          `Invalid keywords: ${invalidKeywords.join(', ')}`
        );
      }
    }

    // 🟢 Calculate initial completion percentage
    const initialCompletionPercentage = this.calculateCompletionPercentage({
      ...createAcademyDto,
      contactEmail: email, // Since contactEmail is set here, include it in the calculation
      keyWords,
    });

    const academy = this.academyRepository.create({
      ...createAcademyDto,
      created_by: userId,
      email,
      contactEmail: email,
      completionPercentage: initialCompletionPercentage, // 🟢 Set the calculated value
    });

    try {
      return await this.academyRepository.save(academy);
    } catch (error) {
      if ((error as any).code === '23505') {
        throw new ConflictException('Academy with this name or slug already exists.');
      }
      throw new InternalServerErrorException('Failed to create academy.');
    }
  }

  async findAll(): Promise<any[]> {
    // 1) Load academies with instructors in one go
    const academies = await this.academyRepository.find({
      relations: ['instructors'],
    });

    if (academies.length === 0) return [];

    // 2) Collect unique creator IDs and academy IDs
    const createdByIds = Array.from(
      new Set(academies.map((a) => a.created_by).filter(Boolean)),
    );
    const academyIds = academies.map((a) => a.id);

    // 3) Fetch creators (profile + role)
    const creators = await this.userRepository.find({
      where: { id: In(createdByIds) },
      relations: ['profile', 'role'],
    });
    const creatorsById = new Map(creators.map((c) => [c.id, c]));

    // 4) Fetch student counts per academy (via enrolled courses)
    // This counts DISTINCT students across all courses in an academy
    const studentCountsRaw = await this.courseStudentRepository
      .createQueryBuilder('cs')
      .select('course.academy_id', 'academyId')
      .addSelect('COUNT(DISTINCT cs.student_id)', 'count')
      .innerJoin('cs.course', 'course')
      .where('course.academy_id IN (:...academyIds)', { academyIds })
      .groupBy('course.academy_id')
      .getRawMany();

    const studentsCountMap = new Map(
      studentCountsRaw.map((r) => [r.academyId as string, Number(r.count)]),
    );

    // 5) Merge everything into formatted result
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
        photoUrl: inst.photoUrl || null,
        biography: inst.biography || null,
      }));

      const studentsCount = studentsCountMap.get(academy.id) || 0;

      return {
        ...academy,
        completionPercentage: parseFloat(academy.completionPercentage as any),
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

    const studentCountRaw = await this.courseStudentRepository
      .createQueryBuilder('cs')
      .select('COUNT(DISTINCT cs.student_id)', 'count')
      .innerJoin('cs.course', 'course')
      .where('course.academy_id = :academyId', { academyId: id })
      .getRawOne();

    const studentsCount = Number(studentCountRaw?.count || 0);

    return {
      ...academy,
      completionPercentage: parseFloat(academy.completionPercentage as any),
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
        photoUrl: inst.photoUrl || null,
        biography: inst.biography || null,
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

    let studentsCount = academy.fakeStudentsCount ?? 0;

    // Only query real student count if needed
    if (academy.displayRealStudentsCount) {
      const studentCountRaw = await this.courseStudentRepository
        .createQueryBuilder('cs')
        .select('COUNT(DISTINCT cs.student_id)', 'count')
        .innerJoin('cs.course', 'course')
        .where('course.academy_id = :academyId', { academyId: academy.id })
        .getRawOne();

      studentsCount = Number(studentCountRaw?.count || 0);
    }

    return {
      ...academy,
      completionPercentage: parseFloat(academy.completionPercentage as any),
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
        photoUrl: inst.photoUrl || null,
        biography: inst.biography || null,
      })) || [],
      studentsCount,
    };
  }

  async update(id: string, updateAcademyDto: UpdateAcademyDto) {
    // Validate keywords (no try/catch here)
    if (updateAcademyDto.keyWords && updateAcademyDto.keyWords.length > 0) {
      const { keyWords } = updateAcademyDto;

      const foundKeywords = await this.academyKeywordRepository
        .createQueryBuilder('kw')
        .where('kw.name IN (:...keyWords)', { keyWords })
        .getMany();

      const foundNames = foundKeywords.map(k => k.name);
      const invalidKeywords = keyWords.filter(k => !foundNames.includes(k));

      if (invalidKeywords.length > 0) {
        throw new BadRequestException(
          `Invalid keywords: ${invalidKeywords.join(', ')}`
        );
      }
    }

    // 1. Fetch current academy data
    const existingAcademy = await this.academyRepository.findOneBy({ id });
    if (!existingAcademy) {
      throw new NotFoundException('Academy not found.');
    }

    // 2. Merge existing data with update DTO for calculation
    const updatedEntity = {
      ...existingAcademy,
      ...updateAcademyDto,
    };

    // 3. 🟢 Calculate new percentage based on the merged entity
    const newCompletionPercentage = this.calculateCompletionPercentage(updatedEntity);

    // 4. Update the DTO to include the new percentage
    const finalUpdateDto = {
      ...updateAcademyDto,
      completionPercentage: newCompletionPercentage, // 🟢 Add the new percentage to the update object
    };

    try {
      await this.academyRepository.update(id, finalUpdateDto);
      return this.findOne(id);
    } catch (error) {
      if ((error as any).code === '23505') {
        throw new ConflictException(
          'Academy with this name or slug already exists.',
        );
      }
      console.error(error);
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

  async createKeyword(dto: CreateAcademyKeywordDto) {
    const exists = await this.academyKeywordRepository.findOne({ where: { name: dto.name } });
    if (exists) {
      throw new BadRequestException('Keyword already exists');
    }

    const keyword = this.academyKeywordRepository.create(dto);
    return this.academyKeywordRepository.save(keyword);
  }

  async findAllKeywords() {
    return this.academyKeywordRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Private method to calculate the profile completion percentage.
   * Tracks 13 key fields for a well-rounded profile.
   */
  private calculateCompletionPercentage(academy: Partial<Academy>): number {
    // Fields tracked for 100% completion (12 simple fields + 1 array field = 13 total checks)
    const checklist: (keyof Academy)[] = [
      'image', // Logo
      'cover', // Cover image
      'description', // Short description
      'about', // Detailed about section
      'type',
      'size',
      'foundedYear',
      'address',
      'city',
      'country',
      'contactEmail',
      'phone',
    ];

    const TOTAL_POINTS = checklist.length + 1; // +1 point for keyWords array
    let filledCount = 0;

    // 1. Check simple fields
    for (const field of checklist) {
      const value = academy[field];
      // Check for non-null, non-undefined, and non-empty string/object
      if (value !== undefined && value !== null && value !== '') {
        // Handle JSON columns (city/country) to ensure they aren't just empty objects
        if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
          continue;
        }
        filledCount++;
      }
    }

    // 2. Special check for keyWords array
    if (
      Array.isArray(academy.keyWords) &&
      academy.keyWords.filter(k => k && k.trim() !== '').length > 0
    ) {
      filledCount++;
    }

    const percentage = (filledCount / TOTAL_POINTS) * 100;
    // Return fixed to 2 decimal places
    return parseFloat(percentage.toFixed(2));
  }
}
