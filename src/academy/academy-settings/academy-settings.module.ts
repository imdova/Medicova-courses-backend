import { Module } from '@nestjs/common';
import { AcademySettingsService } from './academy-settings.service';
import { AcademySettingsController } from './academy-settings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademySetting } from './entities/academy-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AcademySetting]),
  ],
  controllers: [AcademySettingsController],
  providers: [AcademySettingsService],
})
export class AcademySettingsModule { }
