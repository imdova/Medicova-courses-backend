import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProfileCategory } from './entities/profile-category.entity';
import { ProfileSpeciality } from './entities/profile-specaility.entity';
import { CreateProfileCategoryDto } from './dto/create-profile-category.dto';
import { UpdateProfileCategoryDto } from './dto/update-profile-category.dto';

@Injectable()
export class ProfileCategoryService {
  constructor(
    @InjectRepository(ProfileCategory)
    private readonly categoryRepo: Repository<ProfileCategory>,
    @InjectRepository(ProfileSpeciality)
    private readonly specialityRepo: Repository<ProfileSpeciality>,
  ) {}

  async create(
    dto: CreateProfileCategoryDto,
    userId: string,
  ): Promise<ProfileCategory> {
    const { specialities, ...rest } = dto;

    // Step 1: create category
    const category = this.categoryRepo.create({
      ...rest,
      createdBy: userId,
    });
    await this.categoryRepo.save(category);

    // Step 2: bulk insert specialities (safe for large arrays)
    if (specialities?.length) {
      await this.specialityRepo
        .createQueryBuilder()
        .insert()
        .into(ProfileSpeciality)
        .values(
          specialities.map((name) => ({
            name,
            category: { id: category.id },
          })),
        )
        .execute();
    }

    // Step 3: reload category with specialities
    return this.findOne(category.id);
  }

  findAll(): Promise<ProfileCategory[]> {
    return this.categoryRepo.find({ relations: ['specialities'] });
  }

  async findOne(id: string): Promise<ProfileCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['specialities'],
    });
    if (!category) {
      throw new NotFoundException(`Category with id ${id} not found`);
    }
    return category;
  }

  async update(
    id: string,
    dto: UpdateProfileCategoryDto,
  ): Promise<ProfileCategory> {
    const { specialities, ...rest } = dto;
    const category = await this.findOne(id);

    Object.assign(category, rest);
    await this.categoryRepo.save(category);

    if (specialities) {
      // delete old ones in bulk
      await this.specialityRepo.delete({ category: { id } });

      // bulk insert new ones
      if (specialities.length) {
        await this.specialityRepo
          .createQueryBuilder()
          .insert()
          .into(ProfileSpeciality)
          .values(
            specialities.map((name) => ({
              name,
              category: { id },
            })),
          )
          .execute();
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepo.remove(category);
  }

  async addSpecialities(id: string, names: string[]): Promise<ProfileCategory> {
    const category = await this.findOne(id);

    const specialityEntities = names.map((name) =>
      this.specialityRepo.create({ name, category }),
    );

    await this.specialityRepo.save(specialityEntities);
    return this.findOne(id);
  }

  async removeSpecialities(
    categoryId: string,
    specialityIds: string[],
  ): Promise<ProfileCategory> {
    if (!specialityIds?.length) return this.findOne(categoryId);

    await this.specialityRepo
      .createQueryBuilder()
      .delete()
      .from(ProfileSpeciality)
      .where('categoryId = :categoryId', { categoryId })
      .andWhere('id IN (:...ids)', { ids: specialityIds })
      .execute();

    return this.findOne(categoryId);
  }
}
