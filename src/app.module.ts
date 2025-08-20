import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user/entities/user.entity';
import { ProfileModule } from './profile/profile.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { join } from 'path';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { PasswordResetToken } from './user/entities/password-reset-token.entity';
import { InstructorProfile } from './profile/instructor-profile/entities/instructor-profile.entity';
import { CourseModule } from './course/course.module';
import { Course } from './course/entities/course.entity';
import { CoursePricing } from './course/course-pricing/entities/course-pricing.entity';
import { CourseTag } from './course/entities/course-tags.entity';
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
      entities: [
        User,
        PasswordResetToken,
        InstructorProfile,
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
      ],
      synchronize: true,
      extra: {
        max: 5, // small pool for serverless
      },
    }),
    UserModule,
    ProfileModule,
    AuthModule,
    MailerModule.forRoot({
      transport: process.env.SMTP_TRANSPORT,
      template: {
        dir: join(__dirname, '..', 'src', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    CourseModule,
    QuizModule,
    BundleModule,
    CouponModule,
    AcademyModule,
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
