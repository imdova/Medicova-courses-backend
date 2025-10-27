import { forwardRef, Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from 'src/user/entities/user.entity';
import { Course } from 'src/course/entities/course.entity';
import { Profile } from 'src/profile/entities/profile.entity';
import { Role } from 'src/user/entities/roles.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseProgress } from 'src/course/course-progress/entities/course-progress.entity';
import { CourseSectionItem } from 'src/course/course-section/entities/course-section-item.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { IdentityVerification } from 'src/user/entities/identity-verification.entity';
import { Quiz } from 'src/quiz/entities/quiz.entity';
import { QuizQuestion } from 'src/quiz/entities/quiz-question.entity';
import { QuizAttempt } from 'src/quiz/entities/quiz-attempts.entity';
import { Question } from 'src/quiz/entities/question.entity';
import { ProfileModule } from 'src/profile/profile.module';
import { EmailService } from '../common/email.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Course, Profile, Role, CourseSectionItem, CourseProgress, CourseStudent, IdentityVerification, Quiz, QuizQuestion, QuizAttempt, Question]),
  forwardRef(() => ProfileModule)],
  controllers: [AdminController],
  providers: [AdminService, EmailService],
})
export class AdminModule { }
