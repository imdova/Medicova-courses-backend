// dto/update-academy-instructor.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateAcademyInstructorDto } from './create-academy-instructor.dto';

export class UpdateAcademyInstructorDto extends PartialType(
  CreateAcademyInstructorDto,
) {}
