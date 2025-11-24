// src/file-upload/file-upload.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { GcpStorageService } from './gcp-storage.service';

@Injectable()
export class FileUploadService {
  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    private readonly gcpStorage: GcpStorageService,
  ) { }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    folder: string = 'general'
  ): Promise<FileUpload> {
    try {
      // Upload to Google Cloud Storage
      const uploadResult = await this.gcpStorage.uploadFile(file, folder);

      // Save file metadata to database
      const fileEntity = this.fileRepository.create({
        filename: uploadResult.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: uploadResult.url,
        bucket: process.env.GCP_STORAGE_BUCKET || 'medicova-courses-files',
        path: uploadResult.path,
        createdBy: userId,
      });

      return await this.fileRepository.save(fileEntity);
    } catch (error) {
      throw new BadRequestException(`File upload failed: ${error.message}`);
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    userId: string,
    folder: string = 'general'
  ): Promise<FileUpload[]> {
    const uploadPromises = files.map(file =>
      this.uploadFile(file, userId, folder)
    );
    return Promise.all(uploadPromises);
  }

  async findOne(id: string): Promise<FileUpload> {
    const file = await this.fileRepository.findOne({
      where: { id },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async findAllByUser(userId: string): Promise<FileUpload[]> {
    return this.fileRepository.find({
      where: { createdBy: userId },
      order: { created_at: 'DESC' },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const file = await this.findOne(id);

    // Check if user owns the file
    if (file.createdBy !== userId) {
      throw new BadRequestException('You can only delete your own files');
    }

    try {
      // Delete from Google Cloud Storage
      await this.gcpStorage.deleteFile(file.path);

      // Delete from database
      await this.fileRepository.remove(file);
    } catch (error) {
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }

  async getSignedUrl(id: string, expiresInMinutes: number = 15): Promise<string> {
    const file = await this.findOne(id);

    try {
      return await this.gcpStorage.getSignedUrl(file.path, expiresInMinutes);
    } catch (error) {
      throw new BadRequestException(`Signed URL generation failed: ${error.message}`);
    }
  }
}