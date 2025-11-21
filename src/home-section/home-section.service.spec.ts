import { Test, TestingModule } from '@nestjs/testing';
import { HomeSectionService } from './home-section.service';

describe('HomeSectionService', () => {
  let service: HomeSectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HomeSectionService],
    }).compile();

    service = module.get<HomeSectionService>(HomeSectionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
