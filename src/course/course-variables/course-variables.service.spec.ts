import { Test, TestingModule } from '@nestjs/testing';
import { CourseVariablesService } from './course-variables.service';

describe('CourseVariablesService', () => {
  let service: CourseVariablesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseVariablesService],
    }).compile();

    service = module.get<CourseVariablesService>(CourseVariablesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
