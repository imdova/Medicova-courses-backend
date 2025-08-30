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
      ],
      synchronize: true,
      extra: {
        max: 5, // small pool for serverless
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
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService],
})
export class AppModule {}
