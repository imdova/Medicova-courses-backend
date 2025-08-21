import { ApiProperty } from '@nestjs/swagger';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCourseSectionDto } from './create-course-section.dto';
import { CreateCourseSectionItemDto } from './create-course-section-item.dto';

export class CreateSectionWithItemsDto {
  @ApiProperty({
    type: CreateCourseSectionDto,
    example: {
      name: 'Introduction',
      description: 'Getting started with the course',
      order: 1,
    },
  })
  @ValidateNested()
  @Type(() => CreateCourseSectionDto)
  section: CreateCourseSectionDto;

  @ApiProperty({
    type: [CreateCourseSectionItemDto],
    example: [
      {
        curriculumType: 'lecture',
        lecture: {
          title: 'Welcome',
          videoUrl: 'https://example.com/welcome.mp4',
          isLectureFree: true,
        },
        order: 1,
      },
      {
        curriculumType: 'quiz',
        quizId: '22cb504f-07c1-4990-9087-e265e84658de',
        order: 2,
      },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateCourseSectionItemDto)
  items: CreateCourseSectionItemDto[];
}

export class CreateMultipleSectionsWithItemsDto {
  @ApiProperty({
    type: CreateSectionWithItemsDto,
    isArray: true,
    example: [
      {
        section: {
          name: 'Introduction',
          description: 'Getting started with the course',
          order: 1,
        },
        items: [
          {
            curriculumType: 'lecture',
            lecture: {
              title: 'Welcome',
              videoUrl: 'https://example.com/welcome.mp4',
              isLectureFree: true,
            },
            order: 1,
          },
          {
            curriculumType: 'quiz',
            quizId: '22cb504f-07c1-4990-9087-e265e84658de',
            order: 2,
          },
        ],
      },
      {
        section: {
          name: 'Advanced Topics',
          description: 'Deep dive into NestJS',
          order: 2,
        },
        items: [
          {
            curriculumType: 'lecture',
            lecture: {
              title: 'Dependency Injection',
              videoUrl: 'https://example.com/di.mp4',
              isLectureFree: false,
            },
            order: 1,
          },
          {
            curriculumType: 'quiz',
            quizId: 'fec4afe9-9518-4f8e-872e-35f4e9e93408',
            order: 2,
          },
        ],
      },
    ],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateSectionWithItemsDto)
  sections: CreateSectionWithItemsDto[];
}
