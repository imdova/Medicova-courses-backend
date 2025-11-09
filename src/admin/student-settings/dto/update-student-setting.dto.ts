import { PartialType } from '@nestjs/mapped-types';
import { CreateStudentSettingDto } from './create-student-setting.dto';

export class UpdateStudentSettingDto extends PartialType(CreateStudentSettingDto) {}
