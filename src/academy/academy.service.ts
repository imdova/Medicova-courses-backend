import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Academy } from './entities/academy.entity';
import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';

@Injectable()
export class AcademyService {
  constructor(
    @InjectRepository(Academy)
    private academyRepository: Repository<Academy>,
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
}
