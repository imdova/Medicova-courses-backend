import { Module } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { CertificateController } from './certificate.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from './entities/certificate.entity';
import { Course } from 'src/course/entities/course.entity';
import { CertificateTemplate } from './entities/certificate-template.entity';
import { CertificateAuditTrail } from './entities/certificate-audit-trail.entity';
import { User } from 'src/user/entities/user.entity';
import { FileUploadService } from 'src/file-upload/file-upload.service';
import { FileUpload } from 'src/file-upload/entities/file-upload.entity';
import { AwsS3StorageService } from 'src/file-upload/aws-s3-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, Certificate, CertificateTemplate, CertificateAuditTrail, User, FileUpload])],
  controllers: [CertificateController],
  providers: [CertificateService, FileUploadService, AwsS3StorageService],
})
export class CertificateModule { }
