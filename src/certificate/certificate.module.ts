import { Module } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './entities/certificate.entity';
import { Course } from 'src/course/entities/course.entity';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { CertificateAuditTrail } from './entities/certificate-audit-trail.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Certificate, CertificateTemplate, CertificateAuditTrail, User])],
  controllers: [CertificateController],
  providers: [CertificateService],
})
export class CertificateModule { }
