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
import { Academy, ContactPerson } from './entities/academy.entity';
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
import { instanceToPlain } from 'class-transformer'; // ⬅️ Add this import
import { paginate, PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';

export const ACADEMY_PAGINATION_CONFIG: PaginateConfig<Academy> = {
  sortableColumns: [
    'id',
    'name',
    'type',
    'foundedYear',
    'studentsCount',
    'created_at',
    'updated_at'
  ],
  defaultSortBy: [['created_at', 'DESC']],
  searchableColumns: [
    'name',
    'description',
    'email',
    'address'
  ],
  filterableColumns: {
    type: true,
    isVerified: true,
    'country.name': true,
    'city.name': true,
    'contactPerson.name': true,
    'contactPerson.email': true,
  },
  relations: ['instructors'],
};

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
      keyWords,
    });

    const academy = this.academyRepository.create({
      ...createAcademyDto,
      created_by: userId,
      email,
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

  async findAllPaginated(query: PaginateQuery): Promise<Paginated<Academy>> {
    const result = await paginate(query, this.academyRepository, ACADEMY_PAGINATION_CONFIG);

    if (result.data.length === 0) {
      return result;
    }

    // Enrich the paginated data with additional information
    const enrichedData = await this.enrichAcademiesData(result.data);

    return {
      ...result,
      data: enrichedData,
    };
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

    // 🟢 CRITICAL FIX: Convert the DTO instance to a plain object recursively.
    const plainDto = instanceToPlain(updateAcademyDto);

    const finalUpdateDto = {
      ...plainDto, // ⬅️ Use the plain object version
      completionPercentage: newCompletionPercentage,
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

  async removeInstructor(
    academyId: string,
    instructorId: string,
  ): Promise<void> {

    // Find the instructor by ID and verify the academy relationship
    const instructor = await this.academyInstructorRepository.findOne({
      where: {
        id: instructorId,
        academy: { id: academyId },
      },
    });

    if (!instructor) {
      throw new NotFoundException(
        `Instructor with ID ${instructorId} not found in this academy.`,
      );
    }

    // Perform the deletion
    await this.academyInstructorRepository.remove(instructor);
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
    // 🟢 UPDATED: Removed 'contactEmail' and 'phone' from the main checklist
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
    ];

    // 🟢 NEW: Key mandatory fields inside the contactPerson object
    const CONTACT_PERSON_CHECKLIST: (keyof ContactPerson)[] = [
      'name',
      'title',
      'email',
    ];

    // 🟢 UPDATED: Total points is now 10 (simple fields) + 1 (keyWords array) + 3 (contactPerson key fields) = 14
    const TOTAL_POINTS = checklist.length + 1 + CONTACT_PERSON_CHECKLIST.length;
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

    // 3. 🟢 NEW: Check for key Contact Person fields
    if (academy.contactPerson) {
      const cp = academy.contactPerson;
      // Check for the three key fields required for completion
      for (const field of CONTACT_PERSON_CHECKLIST) {
        const value = cp[field];
        // Check for presence of value that is not undefined, null, or empty string
        if (value !== undefined && value !== null && value !== '') {
          filledCount++;
        }
      }
    }

    const percentage = (filledCount / TOTAL_POINTS) * 100;
    // Return fixed to 2 decimal places
    return parseFloat(percentage.toFixed(2));
  }

  private async enrichAcademiesData(academies: Academy[]): Promise<any[]> {
    const academyIds = academies.map((a) => a.id);
    const createdByIds = Array.from(
      new Set(academies.map((a) => a.created_by).filter(Boolean)),
    );

    // Fetch creators and student counts in parallel
    const [creators, studentCountsRaw] = await Promise.all([
      this.userRepository.find({
        where: { id: In(createdByIds) },
        relations: ['profile', 'role'],
      }),
      this.courseStudentRepository
        .createQueryBuilder('cs')
        .select('course.academy_id', 'academyId')
        .addSelect('COUNT(DISTINCT cs.student_id)', 'count')
        .innerJoin('cs.course', 'course')
        .where('course.academy_id IN (:...academyIds)', { academyIds })
        .groupBy('course.academy_id')
        .getRawMany(),
    ]);

    const creatorsById = new Map(creators.map((c) => [c.id, c]));
    const studentsCountMap = new Map(
      studentCountsRaw.map((r) => [r.academyId as string, Number(r.count)]),
    );

    return academies.map((academy) => {
      const creator = creatorsById.get(academy.created_by);
      const studentsCount = studentsCountMap.get(academy.id) || 0;

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

      // Extract city and country names for easy frontend display
      const cityName = academy.city?.name || null;
      const countryName = academy.country?.name || null;

      // Extract contact information
      const contactName = academy.contactPerson?.name || null;
      const contactEmail = academy.contactPerson?.email || academy.email || null;

      return {
        id: academy.id,
        name: academy.name,
        type: academy.type,
        image: academy.image,
        description: academy.description,
        city: cityName,
        country: countryName,
        foundedYear: academy.foundedYear,
        studentsCount: studentsCount,
        contactName: contactName,
        contactEmail: contactEmail,
        isVerified: academy.isVerified,
        completionPercentage: parseFloat(academy.completionPercentage as any),
        createdBy,
        instructors,
        created_at: academy.created_at,
        updated_at: academy.updated_at,
      };
    });
  }
}
