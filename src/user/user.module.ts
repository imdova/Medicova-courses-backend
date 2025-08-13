import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../common/email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { UserHomeService } from './user-home.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, PasswordResetToken])],
  controllers: [UserController],
  providers: [
    UserService,
    RolesGuard,
    JwtService,
    EmailService,
    UserHomeService,
  ],
})
export class UserModule {}
