import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseVariableDto } from './create-course-variable.dto';

export class UpdateCourseVariableDto extends PartialType(CreateCourseVariableDto) {}
