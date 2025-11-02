import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseTagDto } from './create-course-tag.dto';

export class UpdateCourseTagDto extends PartialType(CreateCourseTagDto) {}
