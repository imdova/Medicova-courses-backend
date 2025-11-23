// src/file-upload/dto/create-file.dto.ts
export class CreateFileUploadDto {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    bucket: string;
    path: string;
}