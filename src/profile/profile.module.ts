import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { InstructorProfileModule } from './instructor-profile/instructor-profile.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), InstructorProfileModule],
  controllers: [ProfileController],
  providers: [ProfileService, RolesGuard, JwtService],
  exports: [ProfileService],
})
export class ProfileModule {}
