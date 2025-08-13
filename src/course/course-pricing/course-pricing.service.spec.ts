import { Test, TestingModule } from '@nestjs/testing';
import { CoursePricingService } from './course-pricing.service';

describe('CoursePricingService', () => {
  let service: CoursePricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursePricingService],
    }).compile();

    service = module.get<CoursePricingService>(CoursePricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
