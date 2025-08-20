import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Academy } from './entities/academy.entity';
import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserRole } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AcademyService {
  constructor(
    @InjectRepository(Academy)
    private academyRepository: Repository<Academy>,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
  ) {}

  async create(createAcademyDto: CreateAcademyDto): Promise<Academy> {
    const academy = this.academyRepository.create(createAcademyDto);
    try {
      return await this.academyRepository.save(academy);
    } catch (error) {
      if ((error as any).code === '23505') {
        throw new ConflictException('Academy already exists.');
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

  async update(id: string, updateAcademyDto: UpdateAcademyDto) {
    await this.academyRepository.update(id, updateAcademyDto);
    return this.findOne(id);
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

    // Ensure role is either INSTRUCTOR or ACCOUNT_ADMIN
    const role = createUserDto.role;

    // Call UserService.register and link the academy
    await this.userService.register({
      ...createUserDto,
      role,
      academy, // link user to academy
    });

    // ✅ Only return a success message
    return { message: 'User registered successfully' };
  }
}
