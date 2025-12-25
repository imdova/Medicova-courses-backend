// src/file-upload/file-upload.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUploadService } from './file-upload.service';
import { FileUploadController } from './file-upload.controller';
import { FileUpload } from './entities/file-upload.entity';
import { AwsS3StorageService } from './aws-s3-storage.service';
//import { GcpStorageService } from './gcp-storage.service';
//import { SupabaseStorageService } from './supabase-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileUpload])],
  controllers: [FileUploadController],
  providers: [FileUploadService, AwsS3StorageService],
  exports: [FileUploadService],
})
export class FileUploadModule { }