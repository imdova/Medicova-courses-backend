import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyService } from './academy.service';
import { AcademyController } from './academy.controller';
import { Academy } from './entities/academy.entity';
import { UserModule } from 'src/user/user.module';
import { AcademyInstructor } from './entities/academy-instructors.entity';
import { User } from 'src/user/entities/user.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { AcademyKeyword } from './entities/academy-keywords.entity';
import { AcademySettingsModule } from './academy-settings/academy-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Academy, AcademyInstructor, User, CourseStudent, AcademyKeyword]),
    forwardRef(() => UserModule),
    AcademySettingsModule,
  ],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule { }
