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

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Profile]),
    forwardRef(() => UserModule),
  ],
  controllers: [ProfileController, PublicProfileController],
  providers: [ProfileService, RolesGuard, JwtService],
  exports: [ProfileService],
})
export class ProfileModule {}
