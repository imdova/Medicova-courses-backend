import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyService } from './academy.service';
import { AcademyController } from './academy.controller';
import { Academy } from './entities/academy.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Academy]), forwardRef(() => UserModule)],
  controllers: [AcademyController],
  providers: [AcademyService],
  exports: [AcademyService],
})
export class AcademyModule {}
