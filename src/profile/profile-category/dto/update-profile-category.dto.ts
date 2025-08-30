import { PartialType } from '@nestjs/mapped-types';
import { CreateProfileCategoryDto } from './create-profile-category.dto';

export class UpdateProfileCategoryDto extends PartialType(
  CreateProfileCategoryDto,
) {}
