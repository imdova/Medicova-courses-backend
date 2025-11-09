import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { paginate, Paginated, PaginateQuery, PaginateConfig } from 'nestjs-paginate';
import { AcademySetting, SettingType } from './entities/academy-setting.entity';
import { CreateAcademySettingDto } from './dto/create-academy-setting.dto';
import { UpdateAcademySettingDto } from './dto/update-academy-setting.dto';

export const ACADEMY_SETTING_PAGINATION_CONFIG: PaginateConfig<AcademySetting> = {
  sortableColumns: [
    'id',
    'priority',
    'displayName',
    'value',
    'type',
    'isActive',
    'created_at',
    'updated_at'
  ] as (keyof AcademySetting)[],
  defaultSortBy: [['created_at', 'DESC']],
  searchableColumns: ['displayName', 'value'],
  filterableColumns: {
    type: true,
    isActive: true,
    parentId: true,
  },
  relations: ['parent'],
};

@Injectable()
export class AcademySettingsService {
  constructor(
    @InjectRepository(AcademySetting)
    private readonly academySettingRepository: Repository<AcademySetting>,
  ) { }

  // -----------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------
  async create(createAcademySettingDto: CreateAcademySettingDto): Promise<AcademySetting> {
    const { displayName, value, parentId, ...rest } = createAcademySettingDto;

    // Generate value from displayName if not provided
    const finalValue = value || this.generateValueFromDisplayName(displayName);

    // Check for duplicates
    await this.checkForDuplicates(displayName, finalValue);

    // Verify parent exists if parentId is provided
    let parent: AcademySetting | null = null;
    if (parentId) {
      parent = await this.academySettingRepository.findOne({
        where: { id: parentId }
      });
      if (!parent) {
        throw new BadRequestException('Parent setting not found');
      }
    }

    const setting = this.academySettingRepository.create({
      ...rest,
      displayName,
      value: finalValue,
      parent,
    });

    try {
      return await this.academySettingRepository.save(setting);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Setting with this displayName or value already exists');
      }
      throw error;
    }
  }

  // -----------------------------------------------------------------
  // LIST (PAGINATED)
  // -----------------------------------------------------------------
  async findAll(query: PaginateQuery): Promise<Paginated<AcademySetting>> {
    return paginate(query, this.academySettingRepository, ACADEMY_SETTING_PAGINATION_CONFIG);
  }

  // -----------------------------------------------------------------
  // READ ONE
  // -----------------------------------------------------------------
  async findOne(id: string): Promise<AcademySetting> {
    const setting = await this.academySettingRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!setting) {
      throw new NotFoundException(`Academy setting with ID ${id} not found`);
    }

    return setting;
  }

  // -----------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------
  async update(id: string, updateAcademySettingDto: UpdateAcademySettingDto): Promise<AcademySetting> {
    const setting = await this.findOne(id);

    const { displayName, value, parentId, ...rest } = updateAcademySettingDto;

    // Check for duplicates if displayName or value is being updated
    if (displayName || value) {
      const finalDisplayName = displayName || setting.displayName;
      const finalValue = value || setting.value;

      if (displayName !== setting.displayName || value !== setting.value) {
        await this.checkForDuplicates(finalDisplayName, finalValue, id);
      }
    }

    // Verify parent exists if parentId is provided
    if (parentId !== undefined) {
      if (parentId === null) {
        setting.parent = null;
        setting.parentId = null;
      } else if (parentId !== setting.parentId) {
        const parent = await this.academySettingRepository.findOne({
          where: { id: parentId }
        });
        if (!parent) {
          throw new BadRequestException('Parent setting not found');
        }
        setting.parent = parent;
        setting.parentId = parentId;
      }
    }

    // Update fields
    Object.assign(setting, rest);

    if (displayName) setting.displayName = displayName;
    if (value) setting.value = value;

    try {
      return await this.academySettingRepository.save(setting);
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new ConflictException('Setting with this displayName or value already exists');
      }
      throw error;
    }
  }

  // -----------------------------------------------------------------
  // DELETE (Soft Delete)
  // -----------------------------------------------------------------
  async remove(id: string): Promise<void> {
    const setting = await this.findOne(id);

    // Check if this setting has children
    const childrenCount = await this.academySettingRepository.count({
      where: { parentId: id }
    });

    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete setting that has child settings');
    }

    setting.deleted_at = new Date();
    await this.academySettingRepository.save(setting);
  }

  // -----------------------------------------------------------------
  // PRIVATE HELPER METHODS
  // -----------------------------------------------------------------
  private generateValueFromDisplayName(displayName: string): string {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');
  }

  private async checkForDuplicates(
    displayName: string,
    value: string,
    excludeId?: string
  ): Promise<void> {
    const query = this.academySettingRepository
      .createQueryBuilder('setting')
      .where('setting.displayName = :displayName OR setting.value = :value', {
        displayName,
        value,
      });

    if (excludeId) {
      query.andWhere('setting.id != :excludeId', { excludeId });
    }

    const existing = await query.getOne();

    if (existing) {
      if (existing.displayName === displayName) {
        throw new ConflictException('Setting with this displayName already exists');
      }
      if (existing.value === value) {
        throw new ConflictException('Setting with this value already exists');
      }
    }
  }
}