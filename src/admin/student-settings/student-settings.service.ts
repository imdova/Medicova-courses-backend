import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { paginate, PaginateConfig, Paginated, PaginateQuery } from 'nestjs-paginate';
import { StudentSetting, SettingType } from './entities/student-setting.entity';
import { CreateStudentSettingDto } from './dto/create-student-setting.dto';
import { UpdateStudentSettingDto } from './dto/update-student-setting.dto';

export const STUDENT_SETTING_PAGINATION_CONFIG: PaginateConfig<StudentSetting> = {
  sortableColumns: [
    'id',
    'priority',
    'displayName',
    'value',
    'type',
    'isActive',
    'created_at',
    'updated_at'
  ],
  defaultSortBy: [['created_at', 'DESC']],
  searchableColumns: ['displayName', 'value'],
  filterableColumns: {
    type: true,
    isActive: true,
    parentId: true,
    'parent.id': true,
  },
  relations: ['parent'],
  maxLimit: 100,
};

@Injectable()
export class StudentSettingsService {
  constructor(
    @InjectRepository(StudentSetting)
    private readonly studentSettingRepository: Repository<StudentSetting>,
  ) { }

  // -----------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------
  async create(createStudentSettingDto: CreateStudentSettingDto): Promise<StudentSetting> {
    const { displayName, value, parentId, ...rest } = createStudentSettingDto;

    // Generate value from displayName if not provided
    const finalValue = value || this.generateValueFromDisplayName(displayName);

    // Check for duplicates
    await this.checkForDuplicates(displayName, finalValue);

    // Verify parent exists if parentId is provided
    let parent: StudentSetting | null = null;
    if (parentId) {
      parent = await this.studentSettingRepository.findOne({
        where: { id: parentId }
      });
      if (!parent) {
        throw new BadRequestException('Parent setting not found');
      }
    }

    const setting = this.studentSettingRepository.create({
      ...rest,
      displayName,
      value: finalValue,
      parent,
    });

    try {
      return await this.studentSettingRepository.save(setting);
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
  async findAll(query: PaginateQuery): Promise<Paginated<StudentSetting>> {
    return paginate(query, this.studentSettingRepository, STUDENT_SETTING_PAGINATION_CONFIG);
  }

  // -----------------------------------------------------------------
  // READ ONE
  // -----------------------------------------------------------------
  async findOne(id: string): Promise<StudentSetting> {
    const setting = await this.studentSettingRepository.findOne({
      where: { id },
      relations: ['parent'],
    });

    if (!setting) {
      throw new NotFoundException(`Student setting with ID ${id} not found`);
    }

    return setting;
  }

  // -----------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------
  async update(id: string, updateStudentSettingDto: UpdateStudentSettingDto): Promise<StudentSetting> {
    const setting = await this.findOne(id);

    const { displayName, value, parentId, ...rest } = updateStudentSettingDto;

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
        const parent = await this.studentSettingRepository.findOne({
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
      return await this.studentSettingRepository.save(setting);
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
    const childrenCount = await this.studentSettingRepository.count({
      where: { parentId: id }
    });

    if (childrenCount > 0) {
      throw new BadRequestException('Cannot delete setting that has child settings');
    }

    setting.deleted_at = new Date();
    await this.studentSettingRepository.save(setting);
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
    const query = this.studentSettingRepository
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