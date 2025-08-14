import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { ProfileService } from './profile.service';
import { CreateInstructorProfileDto } from 'src/profile/instructor-profile/dto/create-instructor-profile.dto';
import { UpdateInstructorProfileDto } from 'src/profile/instructor-profile/dto/update-instructor-profile.dto';
//import { CreateStudentProfileDto } from 'src/profile/student-profile/dto/create-student-profile.dto';
//import { UpdateStudentProfileDto } from 'src/profile/student-profile/dto/update-student-profile.dto';
import { InstructorProfile } from 'src/profile/instructor-profile/entities/instructor-profile.entity';
//import { StudentProfile } from 'src/profile/student-profile/entities/student-profile.entity';

@ApiTags('Admin Profile Management')
@Controller('admin/profiles')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // ===== Instructor Profile =====
  @Post('instructor/:userId')
  @ApiOperation({ summary: 'Create instructor profile for a user' })
  @ApiBody({ type: CreateInstructorProfileDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: InstructorProfile })
  createInstructor(
    @Param('userId') userId: string,
    @Body() dto: CreateInstructorProfileDto,
  ) {
    return this.profileService.createInstructorProfile(userId, dto);
  }

  @Patch('instructor/:userId')
  @ApiOperation({ summary: 'Update instructor profile for a user' })
  @ApiBody({ type: UpdateInstructorProfileDto })
  updateInstructor(
    @Param('userId') userId: string,
    @Body() dto: UpdateInstructorProfileDto,
  ) {
    return this.profileService.updateInstructorProfile(userId, dto);
  }

  @Get('instructor/:userId')
  @ApiOperation({ summary: 'Get instructor profile by user ID' })
  getInstructor(@Param('userId') userId: string) {
    return this.profileService.getInstructorProfileByUserId(userId);
  }

  @Delete('instructor/:userId')
  @ApiOperation({ summary: 'Delete instructor profile by user ID' })
  deleteInstructor(@Param('userId') userId: string) {
    return this.profileService.deleteInstructorProfile(userId);
  }

  // ===== Student Profile =====
  // @Post('student/:userId')
  // @ApiOperation({ summary: 'Create student profile for a user' })
  // @ApiBody({ type: CreateStudentProfileDto })
  // @ApiResponse({ status: HttpStatus.CREATED, type: StudentProfile })
  // createStudent(
  //   @Param('userId') userId: string,
  //   @Body() dto: CreateStudentProfileDto,
  // ) {
  //   return this.adminProfileService.createStudentProfile(userId, dto);
  // }

  // @Patch('student/:userId')
  // @ApiOperation({ summary: 'Update student profile for a user' })
  // @ApiBody({ type: UpdateStudentProfileDto })
  // updateStudent(
  //   @Param('userId') userId: string,
  //   @Body() dto: UpdateStudentProfileDto,
  // ) {
  //   return this.adminProfileService.updateStudentProfile(userId, dto);
  // }

  // @Get('student/:userId')
  // @ApiOperation({ summary: 'Get student profile by user ID' })
  // getStudent(@Param('userId') userId: string) {
  //   return this.profileService.getStudentProfileByUserId(userId);
  // }

  // @Delete('student/:userId')
  // @ApiOperation({ summary: 'Delete student profile by user ID' })
  // deleteStudent(@Param('userId') userId: string) {
  //   return this.profileService.deleteStudentProfile(userId);
  // }

  // ===== Search any profile by Profile ID =====
  // @Get(':profileId')
  // @ApiOperation({
  //   summary: 'Search a profile (instructor or student) by profile ID',
  // })
  // @ApiParam({ name: 'profileId', type: String })
  // async findProfile(@Param('profileId') profileId: string) {
  //   const profile =
  //     (await this.profileService.findInstructorProfileById(profileId)) ||
  //     (await this.profileService.findStudentProfileById(profileId));

  //   if (!profile) {
  //     throw new NotFoundException('Profile not found in any category');
  //   }
  //   return profile;
  // }
}
