// controllers/certificate-templates.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody
} from '@nestjs/swagger';
import { Request } from 'express';
import { CertificateService } from './certificate.service';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { UpdateCertificateTemplateDto } from './dto/update-certificate-template.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from './../auth/permission.guard';
import { RequirePermissions } from './../auth/decorator/permission.decorator';
import { TemplateStatus } from './entities/certificate-template.entity';

@ApiBearerAuth('access_token')
@ApiTags('Certificate Templates')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@Controller('certificate-templates')
export class CertificateController {
  constructor(
    private readonly certificateService: CertificateService,
  ) { }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Create a new certificate template' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string' }
      },
      required: ['file', 'name', 'type']
    }
  })
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any, // Accept as any and parse manually
    @Req() req,
  ) {
    const createDto: CreateCertificateTemplateDto = {
      name: body.name,
      description: body.description,
      type: body.type
    };

    return this.certificateService.create(createDto, file, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all certificate templates' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TemplateStatus,
    description: 'Filter by template status'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all certificate templates.'
  })
  findAll(
    @Req() req,
    @Query('status') status?: TemplateStatus,
  ) {
    const academyId = req.user.academyId; // This comes from the JWT token
    return this.certificateService.findAll(academyId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get certificate templates statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns certificate templates statistics.'
  })
  getStats(@Req() req) {
    return this.certificateService.getStats(req.user.sub);
  }

  @Get('audit-trails')
  @ApiOperation({ summary: 'Get certificate templates audit trails' })
  @ApiResponse({
    status: 200,
    description: 'Returns certificate templates audit trails.'
  })
  getAuditTrails(@Req() req) {
    return this.certificateService.getAuditTrails(req.user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get certificate template by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Certificate template UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the certificate template.'
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate template not found.'
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    const academyId = req.user.academyId;
    return this.certificateService.findById(id, academyId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a certificate template' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Certificate template UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'The certificate template has been successfully updated.'
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate template not found.'
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCertificateTemplateDto: UpdateCertificateTemplateDto,
    @Req() req,
  ) {
    return this.certificateService.update(id, updateCertificateTemplateDto, req.user.sub);
  }

  @Put(':id/publish')
  @ApiOperation({ summary: 'Publish a certificate template' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Certificate template UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'The certificate template has been successfully published.'
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate template not found.'
  })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    return this.certificateService.publish(id, req.user.sub);
  }

  @Put(':id/archive')
  @ApiOperation({ summary: 'Archive a certificate template' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Certificate template UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'The certificate template has been successfully archived.'
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate template not found.'
  })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    return this.certificateService.archive(id, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a certificate template' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Certificate template UUID'
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: 204,
    description: 'The certificate template has been successfully deleted.'
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate template not found.'
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
  ) {
    return this.certificateService.remove(id, req.user.sub);
  }

  @Post(':id/assign-to-course/:courseId')
  @ApiOperation({ summary: 'Assign certificate template to a course' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Certificate template UUID'
  })
  @ApiParam({
    name: 'courseId',
    type: String,
    description: 'Course UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'The certificate template has been successfully assigned to the course.'
  })
  @ApiResponse({
    status: 404,
    description: 'Certificate template or course not found.'
  })
  assignToCourse(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Req() req,
  ) {
    return this.certificateService.assignToCourse(templateId, courseId, req.user.sub);
  }

  @Post('issue-certificate')
  @ApiOperation({ summary: 'Issue a certificate to a student' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string', format: 'uuid' },
        courseId: { type: 'string', format: 'uuid' },
        studentId: { type: 'string', format: 'uuid' },
        metadata: {
          type: 'object',
          example: {
            grade: 'A+',
            finalScore: 95,
            creditsEarned: 3
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'The certificate has been successfully issued.'
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot issue certificate from inactive template.'
  })
  @ApiResponse({
    status: 404,
    description: 'Template, course, or student not found.'
  })
  issueCertificate(
    @Body() body: { templateId: string; courseId: string; studentId: string; metadata?: any },
    @Req() req,
  ) {
    return this.certificateService.issueCertificate({
      ...body,
      issuedBy: req.user.sub
    });
  }

  @Get('student/certificates')
  @ApiOperation({ summary: 'Get student certificates' })
  @ApiResponse({
    status: 200,
    description: 'Returns all certificates for the current student.'
  })
  getStudentCertificates(@Req() req) {
    return this.certificateService.getStudentCertificates(req.user.sub);
  }

  @Get('course/:courseId/certificates')
  @ApiOperation({ summary: 'Get all certificates for a course' })
  @ApiParam({
    name: 'courseId',
    type: String,
    description: 'Course UUID'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns all certificates issued for the course.'
  })
  @ApiResponse({
    status: 404,
    description: 'Course not found.'
  })
  getCourseCertificates(
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Req() req,
  ) {
    return this.certificateService.getCourseCertificates(courseId, req.user.sub);
  }
}