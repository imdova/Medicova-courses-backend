import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursePricingService } from './course-pricing.service';
import { CoursePricingController } from './course-pricing.controller';
import { CoursePricing } from './entities/course-pricing.entity';
import { RolesGuard } from 'src/auth/roles.guard';
import { JwtService } from '@nestjs/jwt';
import { Course } from '../entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CoursePricing, Course])],
  providers: [CoursePricingService, RolesGuard, JwtService],
  controllers: [CoursePricingController],
  exports: [CoursePricingService],
})
export class CoursePricingModule {}
