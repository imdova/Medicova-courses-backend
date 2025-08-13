import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
  Patch,
  Get,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { CreateInstructorProfileDto } from './dto/create-instructor-profile.dto';
import { InstructorProfileService } from './instructor-profile.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { UpdateInstructorProfileDto } from './dto/update-instructor-profile.dto';
import { InstructorProfile } from './entities/instructor-profile.entity';

@ApiTags('Instructor Profile')
@Controller('instructors/:instructorId/profile')
@UseGuards(RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class InstructorProfileController {
  constructor(
    private readonly instructorProfileService: InstructorProfileService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create an instructor profile',
    description:
      'Creates a profile for a specific instructor. Only the instructor or an admin can perform this action.',
  })
  @ApiParam({
    name: 'instructorId',
    type: String,
    description: 'Unique identifier of the instructor',
  })
  @ApiBody({ type: CreateInstructorProfileDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Profile successfully created.',
    type: InstructorProfile,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Instructor is not authorized to create this profile.',
  })
  async create(
    @Param('instructorId') instructorId: string,
    @Body() createProfileDto: CreateInstructorProfileDto,
    @Req() req,
  ) {
    if (instructorId !== req.user.sub) {
      throw new ForbiddenException();
    }

    return this.instructorProfileService.createInstructorProfile(
      instructorId,
      createProfileDto,
    );
  }

  @Patch()
  @ApiOperation({
    summary: 'Update an instructor profile',
    description:
      'Updates the profile of a specific instructor. Only the instructor or an admin can update their profile.',
  })
  @ApiParam({
    name: 'instructorId',
    type: String,
    description: 'Unique identifier of the instructor',
  })
  @ApiBody({ type: CreateInstructorProfileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully.',
    type: InstructorProfile,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Instructor is not authorized to update this profile.',
  })
  async update(
    @Param('instructorId') instructorId: string,
    @Body() updateProfileDto: UpdateInstructorProfileDto,
    @Req() req,
  ) {
    if (instructorId !== req.user.sub) {
      throw new ForbiddenException();
    }

    return this.instructorProfileService.updateInstructorProfile(
      instructorId,
      updateProfileDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get an instructor profile',
    description:
      'Retrieves the profile of a specific instructor. Only the instructor or an admin can view this profile.',
  })
  @ApiParam({
    name: 'instructorId',
    type: String,
    description: 'Unique identifier of the instructor',
  })
  @ApiOkResponse({
    description: 'Profile retrieved successfully.',
    type: InstructorProfile,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Instructor is not authorized to view this profile.',
  })
  async findOne(@Param('instructorId') instructorId: string, @Req() req) {
    if (instructorId !== req.user.sub) {
      throw new ForbiddenException();
    }

    return this.instructorProfileService.getInstructorProfileByUserId(
      instructorId,
    );
  }
}
