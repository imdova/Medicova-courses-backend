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
import { UserRolesPermissionsService } from './user-role-permission.service';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/roles-permission.entity';
import { UserPermissionsController } from './user-permissions.controller';
import { EmailService } from '../common/email.service';
import { IdentityVerification } from './entities/identity-verification.entity';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { Department } from './entities/department.entity';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Course, Profile, Role, Permission, RolePermission, IdentityVerification, Department]),
    forwardRef(() => AuthModule),
    forwardRef(() => ProfileModule),
    forwardRef(() => AcademyModule),
  ],
  controllers: [UserController, UserRolesController, UserPermissionsController, DepartmentController, EmployeeController],
  providers: [UserService, RolesGuard, UserRolesPermissionsService, EmailService, DepartmentService, EmployeeService],
  exports: [UserService],
})
export class UserModule { }
