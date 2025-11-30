// services/certificate-templates.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async findAll(userId: string, status?: TemplateStatus): Promise<CertificateTemplate[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query = this.templateRepository.createQueryBuilder('template');

    // If user is from an academy, filter by academy templates
    if (user.academy) {
      query.where('template.createdBy.academy = :academyId', { academyId: user.academy.id });
    }

    if (status) {
      query.andWhere('template.status = :status', { status });
    }

    return query
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.academy', 'academy')
      .orderBy('template.updated_at', 'DESC')
      .getMany();
  }

  async findById(id: string, userId: string): Promise<CertificateTemplate> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query = this.templateRepository.createQueryBuilder('template')
      .where('template.id = :id', { id })
      .leftJoinAndSelect('template.createdBy', 'createdBy')
      .leftJoinAndSelect('createdBy.academy', 'academy');

    // If user is from an academy, ensure they can only access their academy's templates
    if (user.academy) {
      query.andWhere('createdBy.academy = :academyId', { academyId: user.academy.id });
    }

    const template = await query.getOne();

    if (!template) {
      throw new NotFoundException(`Certificate template with ID ${id} not found`);
    }

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
      performedBy: user,
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
    userId: string
  ): Promise<CertificateTemplate> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(id, userId);

    const updatedTemplate = await this.templateRepository.save({
      ...template,
      ...updateDto
    });

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_UPDATED,
      description: `Template "${template.name}" updated`,
      template: updatedTemplate,
      performedBy: user,
      metadata: { changes: updateDto }
    });

    return updatedTemplate;
  }

  async archive(id: string, userId: string): Promise<CertificateTemplate> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(id, userId);

    const archivedTemplate = await this.templateRepository.save({
      ...template,
      status: TemplateStatus.ARCHIVED,
      archivedAt: new Date()
    });

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_ARCHIVED,
      description: `Template "${template.name}" archived`,
      template: archivedTemplate,
      performedBy: user,
      metadata: { certificatesIssued: template.certificatesIssued }
    });

    return archivedTemplate;
  }

  async publish(id: string, userId: string): Promise<CertificateTemplate> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(id, userId);

    const publishedTemplate = await this.templateRepository.save({
      ...template,
      status: TemplateStatus.ACTIVE
    });

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_PUBLISHED,
      description: `Template "${template.name}" published`,
      template: publishedTemplate,
      performedBy: user
    });

    return publishedTemplate;
  }

  async assignToCourse(templateId: string, courseId: string, userId: string): Promise<Course> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(templateId, userId);
    const course = await this.courseRepository.findOne({
      where: { id: courseId },
      relations: ['instructor', 'academy']
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Check if user has permission to assign template to this course
    if (user.academy && course.academy?.id !== user.academy.id) {
      throw new BadRequestException('You can only assign templates to courses in your academy');
    }

    // Update the course with the certificate template
    const updatedCourse = await this.courseRepository.save({
      ...course,
      certificateTemplate: template
    });

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_UPDATED,
      description: `Template "${template.name}" assigned to course "${course.name}"`,
      template: template,
      performedBy: user,
      metadata: { courseId: course.id, courseName: course.name }
    });

    return updatedCourse;
  }

  async issueCertificate(data: {
    templateId: string;
    courseId: string;
    studentId: string;
    issuedBy: string; // Now accepts user ID string
    metadata?: any;
  }): Promise<Certificate> {
    const user = await this.userRepository.findOne({
      where: { id: data.issuedBy },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(data.templateId, data.issuedBy);

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
      issuedBy: user,
      course: course,
      student: student,
      metadata: data.metadata
    });

    const savedCertificate = await this.certificateRepository.save(certificate);

    // Update issued count
    await this.templateRepository.update(template.id, {
      certificatesIssued: () => 'certificates_issued + 1'
    });

    await this.createAuditTrail({
      action: AuditAction.CERTIFICATE_ISSUED,
      description: `Certificate issued to ${savedCertificate.studentName} for course "${course.name}"`,
      template: template,
      performedBy: user,
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
      relations: ['template', 'course', 'issuedBy', 'issuedBy.profile'],
      order: { issuedDate: 'DESC' }
    });
  }

  async getCourseCertificates(courseId: string, userId: string): Promise<Certificate[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query = this.certificateRepository.createQueryBuilder('certificate')
      .where('certificate.course = :courseId', { courseId })
      .leftJoinAndSelect('certificate.template', 'template')
      .leftJoinAndSelect('certificate.student', 'student')
      .leftJoinAndSelect('student.profile', 'studentProfile')
      .leftJoinAndSelect('certificate.issuedBy', 'issuedBy')
      .leftJoinAndSelect('issuedBy.profile', 'issuedByProfile')
      .orderBy('certificate.issuedDate', 'DESC');

    // If user is from an academy, ensure they can only access their academy's certificates
    if (user.academy) {
      query
        .leftJoin('certificate.course', 'course')
        .andWhere('course.academy = :academyId', { academyId: user.academy.id });
    }

    return query.getMany();
  }

  async getAuditTrails(userId: string): Promise<CertificateAuditTrail[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query = this.auditTrailRepository.createQueryBuilder('audit')
      .leftJoinAndSelect('audit.template', 'template')
      .leftJoinAndSelect('audit.performedBy', 'performedBy')
      .leftJoinAndSelect('performedBy.profile', 'profile')
      .orderBy('audit.created_at', 'DESC')
      .take(50);

    // If user is from an academy, filter by academy templates
    if (user.academy) {
      query
        .leftJoin('template.createdBy', 'createdBy')
        .andWhere('createdBy.academy = :academyId', { academyId: user.academy.id });
    }

    return query.getMany();
  }

  async getStats(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['academy']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const query = this.templateRepository.createQueryBuilder('template');

    // If user is from an academy, filter by academy
    if (user.academy) {
      query
        .leftJoin('template.createdBy', 'createdBy')
        .where('createdBy.academy = :academyId', { academyId: user.academy.id });
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

  async remove(id: string, userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const template = await this.findById(id, userId);

    // Check if template has issued certificates
    if (template.certificatesIssued > 0) {
      throw new BadRequestException('Cannot delete template with issued certificates. Archive it instead.');
    }

    await this.templateRepository.remove(template);

    await this.createAuditTrail({
      action: AuditAction.TEMPLATE_ARCHIVED,
      description: `Template "${template.name}" deleted`,
      template: template,
      performedBy: user,
      metadata: {
        templateName: template.name,
        certificatesIssued: template.certificatesIssued
      }
    });
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
    performedBy: User;
    metadata?: any;
  }): Promise<void> {
    const auditTrail = this.auditTrailRepository.create({
      action: data.action,
      description: data.description,
      template: data.template,
      performedBy: data.performedBy,
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