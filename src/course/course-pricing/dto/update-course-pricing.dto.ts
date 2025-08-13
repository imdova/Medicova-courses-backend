import { PartialType } from '@nestjs/mapped-types';
import { CreateCoursePricingDto } from './create-course-pricing.dto';

export class UpdateCoursePricingDto extends PartialType(
  CreateCoursePricingDto,
) {}
