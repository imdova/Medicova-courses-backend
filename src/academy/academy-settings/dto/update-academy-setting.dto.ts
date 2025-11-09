import { PartialType } from '@nestjs/mapped-types';
import { CreateAcademySettingDto } from './create-academy-setting.dto';

export class UpdateAcademySettingDto extends PartialType(CreateAcademySettingDto) {}
