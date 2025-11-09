import { Module } from '@nestjs/common';
import { StudentSettingsService } from './student-settings.service';
import { StudentSettingsController } from './student-settings.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentSetting } from './entities/student-setting.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentSetting]),
  ],
  controllers: [StudentSettingsController],
  providers: [StudentSettingsService],
})
export class StudentSettingsModule { }
