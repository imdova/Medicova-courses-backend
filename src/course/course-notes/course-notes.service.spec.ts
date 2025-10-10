import { Test, TestingModule } from '@nestjs/testing';
import { CourseNotesService } from './course-notes.service';

describe('CourseNotesService', () => {
  let service: CourseNotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseNotesService],
    }).compile();

    service = module.get<CourseNotesService>(CourseNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
