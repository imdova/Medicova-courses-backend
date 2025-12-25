// src/file-upload/aws-s3-storage.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AwsS3StorageService {
    private s3Client: S3Client;
    private bucket: string;
    private region: string;

    constructor() {
        this.region = process.env.AWS_REGION || 'eu-north-1';
        this.bucket = process.env.AWS_BUCKET_NAME || 'medicova-shop';

        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY || '',
                secretAccessKey: process.env.AWS_SECRET_KEY || '',
            },
        });
    }

    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'general'
    ): Promise<{ url: string; path: string }> {
        // Validate file type (same validation logic)
        const allowedMimeTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-matroska',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'application/zip',
            'application/x-rar-compressed'
        ];

        const allowedExtensions = [
            'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
            'pdf',
            'csv', 'txt',
            'xls', 'xlsx',
            'doc', 'docx',
            'mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv',
            'mp3', 'wav', 'ogg', 'm4a',
            'zip', 'rar', '7z'
        ];

        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

        if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(fileExtension)) {
            throw new BadRequestException(
                `File type "${file.mimetype}" not allowed. ` +
                `Allowed types: Images, PDF, CSV, Excel, Word, Videos, Audio, Archives`
            );
        }

        const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new BadRequestException(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
        }

        // Generate unique filename
        const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

        try {
            // Upload to S3
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
                // Note: ACL is deprecated in some regions. 
                // Make sure your bucket has public read access via bucket policy instead
            });

            await this.s3Client.send(command);

            // Get public URL
            const publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`;

            return {
                url: publicUrl,
                path: fileName,
            };
        } catch (error) {
            throw new BadRequestException(`File upload failed: ${error.message}`);
        }
    }

    async deleteFile(filePath: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: filePath,
            });

            await this.s3Client.send(command);
        } catch (error) {
            throw new BadRequestException(`File deletion failed: ${error.message}`);
        }
    }

    async getSignedUrl(filePath: string, expiresInMinutes: number = 15): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: filePath,
            });

            const signedUrl = await getSignedUrl(this.s3Client, command, {
                expiresIn: expiresInMinutes * 60,
            });

            return signedUrl;
        } catch (error) {
            throw new BadRequestException(`Signed URL generation failed: ${error.message}`);
        }
    }
}

