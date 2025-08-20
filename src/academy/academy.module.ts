import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyService } from './academy.service';
import { AcademyController } from './academy.controller';
import { Academy } from './entities/academy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Academy])],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}
