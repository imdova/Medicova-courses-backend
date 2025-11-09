import { Test, TestingModule } from '@nestjs/testing';
import { AcademySettingsService } from './academy-settings.service';

describe('AcademySettingsService', () => {
  let service: AcademySettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcademySettingsService],
    }).compile();

    service = module.get<AcademySettingsService>(AcademySettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
