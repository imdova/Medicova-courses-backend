// src/file-upload/gcp-storage.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GcpStorageService {
    private storage: Storage;
    private bucket: string;

    constructor() {
        this.storage = new Storage({
            projectId: process.env.GCP_PROJECT_ID,
            credentials: {
                //type: 'service_account',
                // project_id: process.env.GCP_PROJECT_ID,
                // private_key_id: process.env.GCP_PRIVATE_KEY_ID,
                private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Fix newlines
                client_email: process.env.GCP_CLIENT_EMAIL,
                // client_id: process.env.GCP_CLIENT_ID, // Optional
                // auth_uri: 'https://accounts.google.com/o/oauth2/auth',
                // token_uri: 'https://oauth2.googleapis.com/token',
                // auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
                // client_x509_cert_url: process.env.GCP_CLIENT_X509_CERT_URL, // Optional
            },
        });
        this.bucket = process.env.GCP_STORAGE_BUCKET;
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
            // Upload to GCP Storage
            const bucket = this.storage.bucket(this.bucket);
            const blob = bucket.file(fileName);

            const blobStream = blob.createWriteStream({
                resumable: false,
                metadata: {
                    contentType: file.mimetype,
                },
            });

            await new Promise((resolve, reject) => {
                blobStream.on('error', reject);
                blobStream.on('finish', resolve);
                blobStream.end(file.buffer);
            });

            // Make file publicly accessible (optional)
            //await blob.makePublic();

            // Get public URL
            const publicUrl = `https://storage.googleapis.com/${this.bucket}/${fileName}`;

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
            const bucket = this.storage.bucket(this.bucket);
            await bucket.file(filePath).delete();
        } catch (error) {
            throw new BadRequestException(`File deletion failed: ${error.message}`);
        }
    }

    async getSignedUrl(filePath: string, expiresInMinutes: number = 15): Promise<string> {
        try {
            const bucket = this.storage.bucket(this.bucket);
            const file = bucket.file(filePath);

            const [signedUrl] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + expiresInMinutes * 60 * 1000,
            });

            return signedUrl;
        } catch (error) {
            throw new BadRequestException(`Signed URL generation failed: ${error.message}`);
        }
    }
}