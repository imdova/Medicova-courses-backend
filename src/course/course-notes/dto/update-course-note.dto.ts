import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseNoteDto } from './create-course-note.dto';

export class UpdateCourseNoteDto extends PartialType(CreateCourseNoteDto) {}
