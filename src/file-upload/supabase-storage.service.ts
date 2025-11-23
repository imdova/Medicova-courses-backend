// src/file-upload/supabase-storage.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SupabaseStorageService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
    }

    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'general'
    ): Promise<{ url: string; path: string }> {
        // Validate file type with extended MIME types
        const allowedMimeTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'text/csv',
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/msword', // .doc
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

        // Also check file extension as backup
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'csv', 'xls', 'xlsx', 'doc', 'docx', 'mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv',
            'mp3', 'wav', 'ogg', 'm4a',
            'zip', 'rar', '7z'];
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();

        if (!allowedMimeTypes.includes(file.mimetype) || !allowedExtensions.includes(fileExtension)) {
            throw new BadRequestException(
                `File type not allowed. Allowed types: images (JPEG, PNG, GIF, WEBP), PDF, CSV, Excel (XLS, XLSX), Word (DOC, DOCX)`
            );
        }

        // Validate file size
        const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 500 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new BadRequestException(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
        }

        // Generate unique filename
        const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

        try {
            const { data, error } = await this.supabase.storage
                .from('medicova-courses-files')
                .upload(fileName, file.buffer, {
                    contentType: file.mimetype,
                    upsert: false,
                });

            if (error) {
                throw new BadRequestException(`Upload failed: ${error.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = this.supabase.storage
                .from('medicova-courses-files')
                .getPublicUrl(fileName);

            return {
                url: publicUrl,
                path: data.path,
            };
        } catch (error) {
            throw new BadRequestException(`File upload failed: ${error.message}`);
        }
    }

    async deleteFile(filePath: string): Promise<void> {
        try {
            const { error } = await this.supabase.storage
                .from('medicova-courses-files')
                .remove([filePath]);

            if (error) {
                throw new BadRequestException(`File deletion failed: ${error.message}`);
            }
        } catch (error) {
            throw new BadRequestException(`File deletion failed: ${error.message}`);
        }
    }

    async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
        const { data, error } = await this.supabase.storage
            .from('medicova-courses-files')
            .createSignedUrl(filePath, expiresIn);

        if (error) {
            throw new BadRequestException(`Signed URL generation failed: ${error.message}`);
        }

        return data.signedUrl;
    }
}