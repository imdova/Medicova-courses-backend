import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/entities/user.entity';
import { ProfileModule } from './profile/profile.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CourseModule } from './course/course.module';
import { Course } from './course/entities/course.entity';
import { CoursePricing } from './course/course-pricing/entities/course-pricing.entity';
import { CourseTag } from './course/course-tags/entities/course-tags.entity';
import { CourseSection } from './course/course-section/entities/course-section.entity';
import { CourseSectionItem } from './course/course-section/entities/course-section-item.entity';
import { Lecture } from './course/course-section/entities/lecture.entity';
import { QuizModule } from './quiz/quiz.module';
import { QuizQuestion } from './quiz/entities/quiz-question.entity';
import { Question } from './quiz/entities/question.entity';
import { Quiz } from './quiz/entities/quiz.entity';
import { BundleModule } from './bundle/bundle.module';
import { Bundle } from './bundle/entities/bundle.entity';
import { BundlePricing } from './bundle/entities/bundle-pricing.entity';
import { CourseBundle } from './bundle/entities/course-bundle.entity';
import { CouponModule } from './coupon/coupon.module';
import { Coupon } from './coupon/entities/coupon.entity';
import { DatabaseService } from './database.service';
import { AcademyModule } from './academy/academy.module';
import { Academy } from './academy/entities/academy.entity';
import { ChatModule } from './chat/chat.module';
import { Chat } from './chat/entities/chat.entity';
import { ChatUser } from './chat/entities/chat-user.entity';
import { ChatMessage } from './chat/entities/chat-message.entity';
import { AssignmentModule } from './assignment/assignment.module';
import { Assignment } from './assignment/entities/assignment.entity';
import { Profile } from './profile/entities/profile.entity';
import { CourseStudent } from './course/entities/course-student.entity';
import { CourseProgress } from './course/course-progress/entities/course-progress.entity';
import { QuizAttempt } from './quiz/entities/quiz-attempts.entity';
import { AssignmentSubmission } from './assignment/entities/assignment-submission.entity';
import { CourseCategory } from './course/course-category/entities/course-category.entity';
import { AcademyInstructor } from './academy/entities/academy-instructors.entity';
import { ProfileCategory } from './profile/profile-category/entities/profile-category.entity';
import { ProfileSpeciality } from './profile/profile-category/entities/profile-specaility.entity';
import { PaymentModule } from './payment/payment.module';
import { Payment } from './payment/entities/payment.entity';
import { Permission } from './user/entities/permission.entity';
import { Role } from './user/entities/roles.entity';
import { RolePermission } from './user/entities/roles-permission.entity';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { CourseRating } from './course/entities/course-rating.entity';
import { ProfileRating } from './profile/entities/profile-rating.entity';
import { CourseCommunity } from './course/course-community/entities/course-community.entity';
import { CourseNote } from './course/course-notes/entities/course-note.entity';
import { CourseFavorite } from './course/entities/course-favorite.entity';
import { AcademyKeyword } from './academy/entities/academy-keywords.entity';
import { AdminModule } from './admin/admin.module';
import { IdentityVerification } from './user/entities/identity-verification.entity';
import { CourseVariable } from './course/course-variables/entities/course-variable.entity';
import { Faq } from './admin/faq/entities/faq.entity';
import { StudentSetting } from './admin/student-settings/entities/student-setting.entity';
import { AcademySetting } from './academy/academy-settings/entities/academy-setting.entity';
import { BlogModule } from './blog/blog.module';
import { Blog } from './blog/entities/blog.entity';
import { BlogCategory } from './blog/blog-category/entities/blog-category.entity';
import { HomeSectionModule } from './home-section/home-section.module';
import { HomeSection } from './home-section/entities/home-section.entity';
import { BlogTag } from './blog/blog-tags/entities/blog-tag.entity';
import { FileUploadModule } from './file-upload/file-upload.module';
import { FileUpload } from './file-upload/entities/file-upload.entity';
import { CartModule } from './cart/cart.module';
import { Cart } from './cart/entities/cart.entity';
import { CartItem } from './cart/entities/cart-item.entity';
import { CertificateModule } from './certificate/certificate.module';
import { Certificate } from './certificate/entities/certificate.entity';
import { CertificateTemplate } from './certificate/entities/certificate-template.entity';
import { CertificateAuditTrail } from './certificate/entities/certificate-audit-trail.entity';
import { Department } from './user/entities/department.entity';
import { Transaction } from './payment/entities/transaction.entity';
import { TicketModule } from './ticket/ticket.module';
import { Ticket } from './ticket/entities/ticket.entity';
import { TestimonialModule } from './testimonial/testimonial.module';
import { Testimonial } from './testimonial/entities/testimonial.entity';
import { InvoiceModule } from './invoice/invoice.module';
import { Invoice } from './invoice/entities/invoice.entity';
import { InvoiceItem } from './invoice/entities/invoice-item.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // <-- This is required
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === undefined ? {
        rejectUnauthorized: false, // ✅ Allow self-signed certs from RDS
      } : false,
      extra: {
        max: 5, // Maximum number of clients in the pool
        connectionTimeoutMillis: 20000, // 20 seconds connection timeout
        idleTimeoutMillis: 30000, // 30 seconds idle timeout
        statement_timeout: 30000, // 30 seconds query timeout
      },
      retryAttempts: 5,
      retryDelay: 3000, // 3 seconds between retries
      logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'migration'] : ['error'],
      entities: [
        User,
        Profile,
        Course,
        CoursePricing,
        CourseTag,
        CourseSection,
        CourseSectionItem,
        Lecture,
        QuizQuestion,
        Question,
        Quiz,
        Bundle,
        BundlePricing,
        CourseBundle,
        Coupon,
        Academy,
        Chat,
        ChatUser,
        ChatMessage,
        Assignment,
        CourseStudent,
        CourseProgress,
        QuizAttempt,
        AssignmentSubmission,
        CourseCategory,
        AcademyInstructor,
        ProfileCategory,
        ProfileSpeciality,
        Payment,
        Role,
        Permission,
        RolePermission,
        CourseRating,
        ProfileRating,
        CourseCommunity,
        CourseNote,
        CourseFavorite,
        AcademyKeyword,
        IdentityVerification,
        CourseVariable,
        Faq,
        StudentSetting,
        AcademySetting,
        Blog,
        BlogCategory,
        HomeSection,
        BlogTag,
        FileUpload,
        Cart,
        CartItem,
        Certificate,
        CertificateTemplate,
        CertificateAuditTrail,
        Department,
        Transaction,
        Ticket,
        Testimonial,
        Invoice,
        InvoiceItem,
      ],
      synchronize: true,
    }),
    MailerModule.forRoot({
      transport:
        process.env.SMTP_TRANSPORT && process.env.SMTP_TRANSPORT.trim() !== ''
          ? process.env.SMTP_TRANSPORT
          : {
              host: process.env.SMTP_HOST || 'localhost',
              port: parseInt(process.env.SMTP_PORT || '587'),
              secure: process.env.SMTP_SECURE === 'true',
              auth:
                process.env.SMTP_USER && process.env.SMTP_PASS
                  ? {
                      user: process.env.SMTP_USER,
                      pass: process.env.SMTP_PASS,
                    }
                  : undefined,
            },
      defaults: {
        from: process.env.SMTP_FROM || '"No Reply" <noreply@example.com>',
      },
      template: {
        dir: join(__dirname, '..', 'src', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    UserModule,
    ProfileModule,
    AuthModule,
    CourseModule,
    QuizModule,
    BundleModule,
    CouponModule,
    AcademyModule,
    ChatModule,
    AssignmentModule,
    PaymentModule,
    AdminModule,
    BlogModule,
    HomeSectionModule,
    FileUploadModule,
    CartModule,
    CertificateModule,
    TicketModule,
    TestimonialModule,
    InvoiceModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
