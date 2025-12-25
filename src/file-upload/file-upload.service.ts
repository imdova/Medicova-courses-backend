import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './entities/file-upload.entity';
import { AwsS3StorageService } from './aws-s3-storage.service';
import { UploadResponseDto } from './dto/upload-response.dto';

@Injectable()
export class FileUploadService {
  constructor(
    @InjectRepository(FileUpload)
    private readonly fileRepository: Repository<FileUpload>,
    private readonly s3Storage: AwsS3StorageService,
  ) { }

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    folder: string = 'general'
  ): Promise<UploadResponseDto> {
    try {
      // Upload to AWS S3
      const uploadResult = await this.s3Storage.uploadFile(file, folder);

      // Save file metadata to database
      const fileEntity = this.fileRepository.create({
        filename: uploadResult.path,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url: uploadResult.url,
        bucket: process.env.AWS_BUCKET_NAME || 'medicova-shop',
        path: uploadResult.path,
        createdBy: userId,
      });

      const savedFile = await this.fileRepository.save(fileEntity);

      return {
        message: 'File uploaded successfully',
        fileId: savedFile.id,
        fileUrl: savedFile.url,
        fileName: savedFile.originalName,
      };
    } catch (error) {
      return {
        error: `File upload failed: ${error.message}`,
        fileName: file.originalname,
      };
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    userId: string,
    folder: string = 'general'
  ): Promise<UploadResponseDto[]> {
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

  async findAll(): Promise<FileUpload[]> {
    return this.fileRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const file = await this.findOne(id);

    // Check if user owns the file
    // if (file.createdBy !== userId) {
    //   throw new BadRequestException('You can only delete your own files');
    // }

    try {
      // Delete from AWS S3
      await this.s3Storage.deleteFile(file.path);

      // Delete from database
      await this.fileRepository.remove(file);

      return { message: 'File deleted successfully' };
    } catch (error) {
      throw new BadRequestException(`File deletion failed: ${error.message}`);
    }
  }

  async getSignedUrl(id: string, expiresInMinutes: number = 15): Promise<string> {
    const file = await this.findOne(id);

    try {
      return await this.s3Storage.getSignedUrl(file.path, expiresInMinutes);
    } catch (error) {
      throw new BadRequestException(`Signed URL generation failed: ${error.message}`);
    }
  }
}