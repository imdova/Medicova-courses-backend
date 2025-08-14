import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurriculumType } from '../entities/course-section-item.entity';
import { CreateLectureDto } from './create-lecture.dto';
import { Type } from 'class-transformer';

export class CreateCourseSectionItemDto {
  @ApiProperty({
    description: 'Type of the curriculum item',
    enum: CurriculumType,
  })
  @IsEnum(CurriculumType)
  curriculumType: CurriculumType;

  @ApiPropertyOptional({
    description: 'Lecture data (only required if curriculumType is LECTURE)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateLectureDto)
  lecture?: CreateLectureDto;

  @ApiPropertyOptional({
    description: 'ID of the quiz',
    format: 'uuid',
  })
  @IsString()
  @IsOptional()
  quizId?: string;

  @ApiProperty({
    description: 'Order of the item within the section',
    example: 1,
  })
  @IsInt()
  @Min(1)
  order: number;
}
