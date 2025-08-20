import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { EmailService } from '../common/email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserHomeService } from './user-home.service';
import { AuthModule } from '../auth/auth.module';
import { InstructorProfileModule } from 'src/profile/instructor-profile/instructor-profile.module';
import { AcademyModule } from 'src/academy/academy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordResetToken]),
    forwardRef(() => AuthModule),
    forwardRef(() => InstructorProfileModule),
    forwardRef(() => AcademyModule),
  ],
  controllers: [UserController],
  providers: [UserService, RolesGuard, EmailService, UserHomeService],
  exports: [UserService],
})
export class UserModule {}
