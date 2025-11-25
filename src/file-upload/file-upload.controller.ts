import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Req,
  Param,
  ParseUUIDPipe,
  UploadedFile,
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
import { UploadResponseDto } from './dto/upload-response.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';

@ApiBearerAuth('access_token')
@ApiTags('Files-Upload')
@Controller('files')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) { }

  @Post()
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
  ): Promise<UploadResponseDto> {
    return this.fileUploadService.uploadFile(file, req.user.sub);
  }

  @Post('multiple')
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
    type: [UploadResponseDto],
  })
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req,
  ): Promise<UploadResponseDto[]> {
    return this.fileUploadService.uploadMultipleFiles(files, req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file by ID (send ID in request body)' })
  @ApiResponse({
    status: 200,
    description: 'File found',
    type: FileResponseDto,
  })
  async getFile(@Param('id', ParseUUIDPipe) id: string): Promise<FileResponseDto> {
    return this.fileUploadService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a file (send ID in request body)' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  async deleteFile(@Param('id', ParseUUIDPipe) id: string, @Req() req): Promise<{ message: string }> {
    return this.fileUploadService.remove(id, req.user.sub);
  }

  // // Optional: Keep the original endpoint for getting user files
  // @Get('my-files')
  // @ApiOperation({ summary: 'Get all files uploaded by current user' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'List of files',
  //   type: [FileResponseDto],
  // })
  // async getUserFiles(@Req() req): Promise<FileResponseDto[]> {
  //   return this.fileUploadService.findAllByUser(req.user.sub);
  // }

  // // Optional: Get all files (admin only)
  // @Get('all')
  // @ApiOperation({ summary: 'Get all files (admin only)' })
  // @ApiResponse({
  //   status: 200,
  //   description: 'List of all files',
  //   type: [FileResponseDto],
  // })
  // async getAllFiles(): Promise<FileResponseDto[]> {
  //   return this.fileUploadService.findAll();
  // }
}