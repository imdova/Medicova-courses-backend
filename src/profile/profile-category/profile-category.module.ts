import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileCategoryService } from './profile-category.service';
import { ProfileCategoryController } from './profile-category.controller';
import { ProfileCategory } from './entities/profile-category.entity';
import { ProfileSpeciality } from './entities/profile-specaility.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProfileCategory, ProfileSpeciality])],
  controllers: [ProfileCategoryController],
  providers: [ProfileCategoryService],
  exports: [ProfileCategoryService], // in case it's needed elsewhere
})
export class ProfileCategoryModule {}
