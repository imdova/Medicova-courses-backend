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
import { UserRolesController } from './user-roles.controller';
import { UserRolesService } from './user-role.service';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/roles-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Course, Profile, Role, Permission, RolePermission]),
    forwardRef(() => AuthModule),
    forwardRef(() => ProfileModule),
    forwardRef(() => AcademyModule),
  ],
  controllers: [UserController, UserRolesController],
  providers: [UserService, RolesGuard, UserRolesService],
  exports: [UserService],
})
export class UserModule { }
