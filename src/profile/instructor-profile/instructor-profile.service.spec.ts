import { Test, TestingModule } from '@nestjs/testing';
import { InstructorProfileService } from './instructor-profile.service';

describe('InstructorProfileService', () => {
  let service: InstructorProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstructorProfileService],
    }).compile();

    service = module.get<InstructorProfileService>(InstructorProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
