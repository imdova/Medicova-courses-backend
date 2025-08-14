import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BundleService } from './bundle.service';
import { BundleController } from './bundle.controller';
import { Bundle } from './entities/bundle.entity';
import { BundlePricing } from './entities/bundle-pricing.entity';
import { CourseBundle } from './entities/course-bundle.entity';
import { Course } from 'src/course/entities/course.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bundle, BundlePricing, CourseBundle, Course]),
  ],
  controllers: [BundleController],
  providers: [BundleService, RolesGuard, JwtService],
  exports: [BundleService], // export in case other modules need bundle logic
})
export class BundleModule {}
