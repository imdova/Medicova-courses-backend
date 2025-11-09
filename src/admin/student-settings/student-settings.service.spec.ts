import { Test, TestingModule } from '@nestjs/testing';
import { StudentSettingsService } from './student-settings.service';

describe('StudentSettingsService', () => {
  let service: StudentSettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentSettingsService],
    }).compile();

    service = module.get<StudentSettingsService>(StudentSettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
