import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCourseSectionDto } from './create-course-section.dto';
import { CreateCourseSectionItemDto } from './create-course-section-item.dto';

export class CreateSectionWithItemsDto {
  @ApiProperty({ type: CreateCourseSectionDto })
  @ValidateNested()
  @Type(() => CreateCourseSectionDto)
  section: CreateCourseSectionDto;

  @ApiProperty({ type: [CreateCourseSectionItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateCourseSectionItemDto)
  items: CreateCourseSectionItemDto[];
}

export class CreateMultipleSectionsWithItemsDto {
  @ApiProperty({ type: [CreateSectionWithItemsDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateSectionWithItemsDto)
  sections: CreateSectionWithItemsDto[];
}
