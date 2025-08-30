import { Test, TestingModule } from '@nestjs/testing';
import { ProfileCategoryService } from './profile-category.service';

describe('ProfileCategoryService', () => {
  let service: ProfileCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileCategoryService],
    }).compile();

    service = module.get<ProfileCategoryService>(ProfileCategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
