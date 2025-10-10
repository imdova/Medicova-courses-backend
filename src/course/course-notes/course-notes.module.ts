import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseNotesService } from './course-notes.service';
import { CourseNotesController } from './course-notes.controller';
import { CourseNote } from './entities/course-note.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CourseNote, CourseStudent])],
  controllers: [CourseNotesController],
  providers: [CourseNotesService],
})
export class CourseNotesModule { }
