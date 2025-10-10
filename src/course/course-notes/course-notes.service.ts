import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseNote } from './entities/course-note.entity';
import { CourseStudent } from 'src/course/entities/course-student.entity';
import { CreateCourseNoteDto } from './dto/create-course-note.dto';
import { UpdateCourseNoteDto } from './dto/update-course-note.dto';

@Injectable()
export class CourseNotesService {
  constructor(
    @InjectRepository(CourseNote)
    private readonly noteRepo: Repository<CourseNote>,

    @InjectRepository(CourseStudent)
    private readonly courseStudentRepo: Repository<CourseStudent>,
  ) { }

  /**
   * 🔹 Ensures that the user is enrolled in the course
   * Returns the CourseStudent record if found
   */
  private async getEnrollment(courseId: string, studentId: string) {
    const enrollment = await this.courseStudentRepo.findOne({
      where: {
        course: { id: courseId },
        student: { id: studentId },
      },
      relations: ['course', 'student'],
    });

    if (!enrollment) {
      throw new ForbiddenException('You are not enrolled in this course');
    }

    return enrollment;
  }

  /**
   * 🔹 CREATE a note
   */
  async create(courseId: string, studentId: string, dto: CreateCourseNoteDto) {
    const enrollment = await this.getEnrollment(courseId, studentId);

    const note = this.noteRepo.create({
      title: dto.title,
      description: dto.description,
      courseStudent: enrollment,
    });

    const saved = await this.noteRepo.save(note);
    return { message: 'Note created successfully', data: saved };
  }

  /**
   * 🔹 GET all notes for a student in a course
   */
  async findAll(courseId: string, studentId: string) {
    const enrollment = await this.getEnrollment(courseId, studentId);

    const notes = await this.noteRepo.find({
      where: {
        courseStudent: { id: enrollment.id },
      },
      order: { created_at: 'DESC' },
    });

    return notes;
  }

  /**
   * 🔹 GET one note
   */
  async findOne(courseId: string, noteId: string, studentId: string) {
    const enrollment = await this.getEnrollment(courseId, studentId);

    const note = await this.noteRepo.findOne({
      where: {
        id: noteId,
        courseStudent: { id: enrollment.id },
      },
    });

    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  /**
   * 🔹 UPDATE a note
   */
  async update(
    courseId: string,
    noteId: string,
    studentId: string,
    dto: UpdateCourseNoteDto,
  ) {
    const enrollment = await this.getEnrollment(courseId, studentId);

    const note = await this.noteRepo.findOne({
      where: {
        id: noteId,
        courseStudent: { id: enrollment.id },
      },
    });

    if (!note) throw new NotFoundException('Note not found');

    Object.assign(note, dto);
    const updated = await this.noteRepo.save(note);

    return { message: 'Note updated successfully', data: updated };
  }

  /**
   * 🔹 DELETE a note
   */
  async remove(courseId: string, noteId: string, studentId: string) {
    const enrollment = await this.getEnrollment(courseId, studentId);

    const note = await this.noteRepo.findOne({
      where: {
        id: noteId,
        courseStudent: { id: enrollment.id },
      },
    });

    if (!note) throw new NotFoundException('Note not found');

    await this.noteRepo.remove(note);
    return { message: 'Note deleted successfully' };
  }
}
