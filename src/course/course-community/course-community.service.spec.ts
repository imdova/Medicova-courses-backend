import { Test, TestingModule } from '@nestjs/testing';
import { CourseCommunityService } from './course-community.service';

describe('CourseCommunityService', () => {
  let service: CourseCommunityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseCommunityService],
    }).compile();

    service = module.get<CourseCommunityService>(CourseCommunityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
