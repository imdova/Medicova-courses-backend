import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstructorProfile } from './entities/instructor-profile.entity';
import { User } from 'src/user/entities/user.entity';
import { InstructorProfileService } from './instructor-profile.service';
import { InstructorProfileController } from './instructor-profile.controller';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, InstructorProfile]), // <-- Add User here
  ],
  controllers: [InstructorProfileController],
  providers: [InstructorProfileService, RolesGuard, JwtService],
  exports: [InstructorProfileService, TypeOrmModule],
})
export class InstructorProfileModule {}
