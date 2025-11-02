import { Test, TestingModule } from '@nestjs/testing';
import { CourseTagsService } from './course-tags.service';

describe('CourseTagsService', () => {
  let service: CourseTagsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseTagsService],
    }).compile();

    service = module.get<CourseTagsService>(CourseTagsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
