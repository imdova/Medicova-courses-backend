import { Injectable, NotFoundException } from '@nestjs/common';
import { InstructorProfileService } from 'src/profile/instructor-profile/instructor-profile.service';
//import { StudentProfileService } from 'src/profile/student-profile/student-profile.service';
import { CreateInstructorProfileDto } from 'src/profile/instructor-profile/dto/create-instructor-profile.dto';
import { UpdateInstructorProfileDto } from 'src/profile/instructor-profile/dto/update-instructor-profile.dto';
//import { CreateStudentProfileDto } from 'src/profile/student-profile/dto/create-student-profile.dto';
//import { UpdateStudentProfileDto } from 'src/profile/student-profile/dto/update-student-profile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstructorProfile } from 'src/profile/instructor-profile/entities/instructor-profile.entity';
//import { StudentProfile } from 'src/profile/student-profile/entities/student-profile.entity';

@Injectable()
export class ProfileService {
  constructor(
    private readonly instructorProfileService: InstructorProfileService,
    //private readonly studentProfileService: StudentProfileService,
    @InjectRepository(InstructorProfile)
    private instructorRepo: Repository<InstructorProfile>, // @InjectRepository(StudentProfile) // private studentRepo: Repository<StudentProfile>,
  ) {}

  // ===== Instructor Profile =====
  createInstructorProfile(userId: string, dto: CreateInstructorProfileDto) {
    return this.instructorProfileService.createInstructorProfile(userId, dto);
  }

  updateInstructorProfile(userId: string, dto: UpdateInstructorProfileDto) {
    return this.instructorProfileService.updateInstructorProfile(userId, dto);
  }

  getInstructorProfileByUserId(userId: string) {
    return this.instructorProfileService.getInstructorProfileByUserId(userId);
  }

  deleteInstructorProfile(userId: string) {
    return this.instructorProfileService.deleteInstructorProfile(userId);
  }

  // ===== Student Profile =====
  // createStudentProfile(userId: string, dto: CreateStudentProfileDto) {
  //   return this.studentProfileService.createStudentProfile(userId, dto);
  // }

  // updateStudentProfile(userId: string, dto: UpdateStudentProfileDto) {
  //   return this.studentProfileService.updateStudentProfile(userId, dto);
  // }

  // getStudentProfileByUserId(userId: string) {
  //   return this.studentProfileService.getStudentProfileByUserId(userId);
  // }

  // deleteStudentProfile(userId: string) {
  //   return this.studentProfileService.deleteStudentProfile(userId);
  // }

  // ===== Search by profile ID =====
  async findInstructorProfileById(profileId: string) {
    return this.instructorRepo.findOne({
      where: { id: profileId },
      relations: ['user'],
    });
  }

  // async findStudentProfileById(profileId: string) {
  //   return this.studentRepo.findOne({
  //     where: { id: profileId },
  //     relations: ['user'],
  //   });
  // }
}
