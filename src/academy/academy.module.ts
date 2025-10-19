import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyService } from './academy.service';
import { AcademyController } from './academy.controller';
import { Academy } from './entities/academy.entity';
import { UserModule } from 'src/user/user.module';
import { AcademyInstructor } from './entities/academy-instructors.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Academy, AcademyInstructor, User]),
    forwardRef(() => UserModule),
  ],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule { }
