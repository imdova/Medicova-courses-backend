// src/file-upload/file-upload.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  UseGuards,
  Req,
  ParseUUIDPipe,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiBody
} from '@nestjs/swagger';
import { FileUploadService } from './file-upload.service';
import { FileResponseDto } from './dto/file-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/decorator/permission.decorator';

@ApiBearerAuth('access_token')
@ApiTags('Files-Upload')
@Controller('files')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) { }

  @Post('upload')
  //@RequirePermissions('files:upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: FileResponseDto,
  })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ): Promise<FileResponseDto> {
    return this.fileUploadService.uploadFile(file, req.user.sub);
  }

  @Post('upload-multiple')
  //@RequirePermissions('files:upload')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiBody({
    description: 'Files to upload',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    type: [FileResponseDto],
  })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ): Promise<FileResponseDto[]> {
    return this.fileUploadService.uploadMultipleFiles(files, req.user.sub);
  }

  @Get(':id')
  //@RequirePermissions('files:read')
  @ApiOperation({ summary: 'Get file by ID' })
  @ApiResponse({
    status: 200,
    description: 'File found',
    type: FileResponseDto,
  })
  async getFile(@Param('id', ParseUUIDPipe) id: string): Promise<FileResponseDto> {
    return this.fileUploadService.findOne(id);
  }

  @Get()
  //@RequirePermissions('files:read')
  @ApiOperation({ summary: 'Get all files uploaded by user' })
  @ApiResponse({
    status: 200,
    description: 'List of files',
    type: [FileResponseDto],
  })
  async getUserFiles(@Req() req): Promise<FileResponseDto[]> {
    return this.fileUploadService.findAllByUser(req.user.sub);
  }

  @Delete(':id')
  //@RequirePermissions('files:delete')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  async deleteFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ): Promise<{ message: string }> {
    await this.fileUploadService.remove(id, req.user.sub);
    return { message: 'File deleted successfully' };
  }
}