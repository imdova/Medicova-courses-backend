import { forwardRef, Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { PublicProfileController } from './public-profile.controller';
import { Profile } from './entities/profile.entity';
import { UserModule } from 'src/user/user.module';
import { ProfileCategoryModule } from './profile-category/profile-category.module';
import { ProfileCategory } from './profile-category/entities/profile-category.entity';
import { ProfileSpeciality } from './profile-category/entities/profile-specaility.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile, ProfileCategory, ProfileSpeciality]),
    forwardRef(() => UserModule),
    ProfileCategoryModule,
  ],
  controllers: [ProfileController, PublicProfileController],
  providers: [ProfileService, RolesGuard, JwtService],
  exports: [ProfileService],
})
export class ProfileModule { }
