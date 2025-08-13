import { PartialType } from '@nestjs/swagger';
import { CreateCourseSectionItemDto } from './create-course-section-item.dto';

export class UpdateCourseSectionItemDto extends PartialType(
  CreateCourseSectionItemDto,
) {}
