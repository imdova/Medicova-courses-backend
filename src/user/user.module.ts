import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthModule } from '../auth/auth.module';
import { ProfileModule } from 'src/profile/profile.module';
import { AcademyModule } from 'src/academy/academy.module';
import { Course } from 'src/course/entities/course.entity';
import { Profile } from 'src/profile/entities/profile.entity';
import { Role } from './entities/roles.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Course, Profile, Role]),
    forwardRef(() => AuthModule),
    forwardRef(() => ProfileModule),
    forwardRef(() => AcademyModule),
  ],
  controllers: [UserController],
  providers: [UserService, RolesGuard],
  exports: [UserService],
})
export class UserModule { }
