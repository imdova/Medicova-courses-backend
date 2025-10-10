import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseCommunityDto } from './create-course-community.dto';

export class UpdateCourseCommunityDto extends PartialType(CreateCourseCommunityDto) {}
