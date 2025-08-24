import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Assignment } from './entities/assignment.entity';
import { AssignmentService } from './assignment.service';
import { AssignmentController } from './assignment.controller';
import { AssignmentSubmission } from './entities/assignment-submission.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { CourseProgress } from 'src/course/course-progress/entities/course-progress.entity';
import { CourseSectionItem } from 'src/course/course-section/entities/course-section-item.entity';
import { CourseAssignmentController } from './course-assignment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      AssignmentSubmission,
      CourseStudent,
      CourseProgress,
      CourseSectionItem,
    ]),
  ],
  providers: [AssignmentService],
  controllers: [AssignmentController, CourseAssignmentController],
  exports: [AssignmentService],
})
export class AssignmentModule {}
