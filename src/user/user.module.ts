import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../common/email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserHomeService } from './user-home.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, PasswordResetToken]), forwardRef(() => AuthModule),],
  controllers: [UserController],
  providers: [
    UserService,
    RolesGuard,
    EmailService,
    UserHomeService,
  ],
})
export class UserModule { }
