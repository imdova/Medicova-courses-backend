// services/certificate-templates.service.ts
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateTemplate, TemplateStatus, TemplateType } from './entities/certificate-template.entity';
import { CertificateAuditTrail, AuditAction } from './entities/certificate-audit-trail.entity';
import { Certificate } from './entities/certificate.entity';
import { CreateCertificateTemplateDto } from './dto/create-certificate-template.dto';
import { UpdateCertificateTemplateDto } from './dto/update-certificate-template.dto';
import { Course } from 'src/course/entities/course.entity';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(CertificateTemplate)
    private readonly templateRepository: Repository<CertificateTemplate>,
    @InjectRepository(CertificateAuditTrail)
    private readonly auditTrailRepository: Repository<CertificateAuditTrail>,
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  private checkTemplateOwnership(
    template: CertificateTemplate,
    userId: string,
    academyId: string | null,
    role: string,
  ) {
    if (role === 'admin') return; // full access

    if (role === 'academy_admin') {
      if (template.createdBy?.academy?.id !== academyId) {
        throw new ForbiddenException(
          'You cannot access certificate templates outside your academy',
        );
      }
    } else {
      // instructor / academy_user / student
      if (template.createdBy?.id !== userId) {
        throw new ForbiddenException(
          'You are not allowed to access this certificate template',
        );
      }
    }
  }

  async findAll(
    userId: string,
    role: string,
    academyId: string | null,
    status?: TemplateStatus
  ): Promise<CertificateTemplate[]> {
    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.academy', 'academy');

    // Apply role-based filtering
    if (role === 'admin') {
      // Admin sees all templates - no additional filters
    } else if (role === 'academy_admin' && academyId) {
      // Academy admin sees templates from their academy
      query.where('createdBy.academy = :academyId', { academyId });
    } else {
      // Regular users only see their own templates
      query.where('template.createdBy = :userId', { userId });
    }

    if (status) {
      query.andWhere('template.status = :status', { status });
    }

    return query
      .orderBy('template.updated_at', 'DESC')
      .getMany();
  }

  async findById(
    id: string,
    userId: string,
    role: string,
    academyId: string | null
  ): Promise<CertificateTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['createdBy', 'createdBy.academy']
    });

    if (!template) {
      throw new NotFoundException(`Certificate template with ID ${id} not found`);
    }

    // Check ownership/access rights
    this.checkTemplateOwnership(template, userId, academyId, role);

    return template;
  }

  async create(
    createDto: CreateCertificateTemplateDto,
    file: Express.Multer.File,
    userId: string
  ): Promise<CertificateTemplate> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.validateFile(file);

    const templateData = {
      name: createDto.name,
      description: createDto.description,
      type: createDto.type as TemplateType,
      fileName: file.originalname,
      fileSize: this.formatFileSize(file.size),
      fileFormat: file.mimetype.split('/')[1],
      createdBy: user,
      status: TemplateStatus.DRAFT
    };

    const template = this.templateRepository.create(templateData);
    const savedTemplate = await this.templateRepository.save(template);

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_CREATED,
      description: `New template "${createDto.name}" uploaded`,
      template: savedTemplate,
      createdBy: user,
      metadata: {
        fileName: file.originalname,
        fileSize: file.size
      }
    });

    return savedTemplate;
  }

  async update(
    id: string,
    updateDto: UpdateCertificateTemplateDto,
    userId: string,
    role: string,
    academyId: string | null
  ): Promise<CertificateTemplate> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(id, userId, role, academyId);

    const updatedTemplate = await this.templateRepository.save({
      ...template,
      ...updateDto
    });

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_UPDATED,
      description: `Template "${template.name}" updated`,
      template: updatedTemplate,
      createdBy: user,
      metadata: { changes: updateDto }
    });

    return updatedTemplate;
  }

  async archive(
    id: string,
    userId: string,
    role: string,
    academyId: string | null
  ): Promise<CertificateTemplate> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(id, userId, role, academyId);

    const archivedTemplate = await this.templateRepository.save({
      ...template,
      status: TemplateStatus.ARCHIVED,
      archivedAt: new Date()
    });

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_ARCHIVED,
      description: `Template "${template.name}" archived`,
      template: archivedTemplate,
      createdBy: user,
      metadata: { certificatesIssued: template.certificatesIssued }
    });

    return archivedTemplate;
  }

  async publish(
    id: string,
    userId: string,
    role: string,
    academyId: string | null
  ): Promise<CertificateTemplate> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(id, userId, role, academyId);

    const publishedTemplate = await this.templateRepository.save({
      ...template,
      status: TemplateStatus.ACTIVE
    });

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_PUBLISHED,
      description: `Template "${template.name}" published`,
      template: publishedTemplate,
      createdBy: user
    });

    return publishedTemplate;
  }

  async assignToCourse(
    templateId: string,
    courseId: string,
    userId: string,
    role: string,
    academyId: string | null
  ): Promise<Course> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check template access
    const template = await this.findById(templateId, userId, role, academyId);

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor', 'academy']
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Check course access based on role
    this.checkCourseOwnership(course, userId, academyId, role);

    // Update the course with the certificate template
    const updatedCourse = await this.courseRepository.save({
      ...course,
      certificateTemplate: template
    });

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_UPDATED,
      description: `Template "${template.name}" assigned to course "${course.name}"`,
      template: template,
      createdBy: user,
      metadata: { courseId: course.id, courseName: course.name }
    });

    return updatedCourse;
  }

  async issueCertificate(data: {
    templateId: string;
    courseId: string;
    studentId: string;
    createdBy: string;
    role: string;
    academyId: string | null;
    metadata?: any;
  }): Promise<Certificate> {
    const user = await this.userRepository.findOne({
      where: { id: data.createdBy },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check template access
    const template = await this.findById(data.templateId, data.createdBy, data.role, data.academyId);

    if (template.status !== TemplateStatus.ACTIVE) {
      throw new BadRequestException('Cannot issue certificates from inactive templates');
    }

    const course = await this.courseRepository.findOne({
      where: { id: data.courseId },
      relations: ['instructor', 'instructor.profile']
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${data.courseId} not found`);
    }

    // Check course access
    this.checkCourseOwnership(course, data.createdBy, data.academyId, data.role);

    const student = await this.userRepository.findOne({
      where: { id: data.studentId },
      relations: ['profile']
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${data.studentId} not found`);
    }

    // Get student name from profile
    const studentName = student.profile
      ? `${student.profile.firstName} ${student.profile.lastName}`
      : student.email;

    // Get instructor signature from course instructor profile
    const instructorSignature = course.instructor?.profile
      ? `${course.instructor.profile.firstName} ${course.instructor.profile.lastName}`
      : course.instructor?.email;

    const certificate = this.certificateRepository.create({
      certificateId: this.generateCertificateId(),
      studentName: studentName,
      courseTitle: course.name,
      completionDate: new Date(),
      issuedDate: new Date(),
      instructorSignature: instructorSignature,
      template: template,
      createdBy: user,
      course: course,
      student: student,
      metadata: data.metadata
    });

    const savedCertificate = await this.certificateRepository.save(certificate);

    // Update issued count
    await this.templateRepository.update(template.id, {
      certificatesIssued: () => 'certificatesIssued + 1'
    });

    await this.createAuditTrail({
      action: AuditAction.CERTIFICATE_ISSUED,
      description: `Certificate issued to ${savedCertificate.studentName} for course "${course.name}"`,
      template: template,
      createdBy: user,
      metadata: {
        certificateId: savedCertificate.certificateId,
        studentId: student.id,
        courseId: course.id
      }
    });

    return savedCertificate;
  }

  async getStudentCertificates(studentId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { student: { id: studentId } },
      relations: ['template', 'course', 'createdBy', 'createdBy.profile'],
      order: { issuedDate: 'DESC' }
    });
  }

  async getCourseCertificates(
    courseId: string,
    userId: string,
    role: string,
    academyId: string | null
  ): Promise<Certificate[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['academy']
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Check course access
    this.checkCourseOwnership(course, userId, academyId, role);

    return this.certificateRepository.find({
      where: { course: { id: courseId } },
      relations: ['template', 'student', 'student.profile', 'createdBy', 'createdBy.profile'],
      order: { issuedDate: 'DESC' }
    });
  }

  async getAuditTrails(
    userId: string,
    role: string,
    academyId: string | null
  ): Promise<CertificateAuditTrail[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query = this.auditTrailRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.template', 'template')
      .leftJoinAndSelect('audit.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.profile', 'profile')
      .orderBy('audit.created_at', 'DESC')
      .take(50);

    // Apply role-based filtering
    if (role === 'admin') {
      // Admin sees all audit trails
    } else if (role === 'academy_admin' && academyId) {
      // Academy admin sees audit trails from their academy
      query
        .leftJoin('template.createdBy', 'createdBy')
        .andWhere('createdBy.academy = :academyId', { academyId });
    } else {
      // Regular users only see their own audit trails
      query.andWhere('audit.createdBy = :userId', { userId });
    }

    return query.getMany();
  }

  async getStats(
    userId: string,
    role: string,
    academyId: string | null
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query = this.templateRepository.createQueryBuilder('template')
      .leftJoin('template.createdBy', 'createdBy');

    // Apply role-based filtering
    if (role === 'admin') {
      // Admin sees all templates
    } else if (role === 'academy_admin' && academyId) {
      // Academy admin sees templates from their academy
      query.where('createdBy.academy = :academyId', { academyId });
    } else {
      // Regular users only see their own templates
      query.where('template.createdBy = :userId', { userId });
    }

    const [draftCount, activeCount, archivedCount] = await Promise.all([
      query.clone().andWhere('template.status = :draft', { draft: TemplateStatus.DRAFT }).getCount(),
      query.clone().andWhere('template.status = :active', { active: TemplateStatus.ACTIVE }).getCount(),
      query.clone().andWhere('template.status = :archived', { archived: TemplateStatus.ARCHIVED }).getCount()
    ]);

    const totalIssuedResult = await query
      .select('SUM(template.certificatesIssued)', 'total')
      .getRawOne();

    return {
      draft: draftCount,
      active: activeCount,
      archived: archivedCount,
      totalIssued: parseInt(totalIssuedResult.total) || 0
    };
  }

  async remove(
    id: string,
    userId: string,
    role: string,
    academyId: string | null
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(id, userId, role, academyId);

    // Check if template has issued certificates
    if (template.certificatesIssued > 0) {
      throw new BadRequestException('Cannot delete template with issued certificates. Archive it instead.');
    }

    // Use soft delete instead of remove
    await this.templateRepository.softDelete(id);

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_ARCHIVED,
      description: `Template "${template.name}" deleted`,
      template: template,
      createdBy: user,
      metadata: {
        templateName: template.name,
        certificatesIssued: template.certificatesIssued
      }
    });
  }

  private checkCourseOwnership(
    course: Course,
    userId: string,
    academyId: string | null,
    role: string,
  ) {
    if (role === 'admin') return; // full access
    if (role === 'academy_admin') {
      if (course.academy?.id !== academyId) {
        throw new ForbiddenException(
          'You cannot access courses outside your academy',
        );
      }
    } else {
      // instructor / academy_user
      if (course.createdBy !== userId) {
        throw new ForbiddenException(
          'You are not allowed to access this course',
        );
      }
    }
  }

  private generateCertificateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CERT-${timestamp}-${random}`.toUpperCase();
  }

  private async createAuditTrail(data: {
    action: AuditAction;
    description: string;
    template: CertificateTemplate;
    createdBy: User;
    metadata?: any;
  }): Promise<void> {
    const auditTrail = this.auditTrailRepository.create({
      action: data.action,
      description: data.description,
      template: data.template,
      createdBy: data.createdBy,
      metadata: data.metadata
    });

    await this.auditTrailRepository.save(auditTrail);
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private validateFile(file: Express.Multer.File): void {
    const allowedFormats = ['pdf', 'png', 'jpg', 'jpeg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!file) {
      throw new BadRequestException('File is required');
    }

    const fileExtension = file.originalname.split('.').pop().toLowerCase();

    if (!allowedFormats.includes(fileExtension)) {
      throw new BadRequestException('Only PDF, PNG, and JPG files are allowed');
    }

    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }
  }
}