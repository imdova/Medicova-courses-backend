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
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { Profile } from './entities/profile.entity';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';

@ApiTags('Profile')
@Controller('users/:userId/profile')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(
  UserRole.INSTRUCTOR,
  UserRole.ADMIN,
  UserRole.STUDENT,
  UserRole.ACADEMY_ADMIN,
)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly userService: UserService,
  ) { }

  @Post()
  @ApiOperation({
    summary: 'Create a profile',
    description:
      'Creates a profile for a specific user. Only the user or an admin can perform this action.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'Unique identifier of the user',
  })
  @ApiBody({ type: CreateProfileDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Profile successfully created.',
    type: Profile,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not authorized to create this profile.',
  })
  async create(
    @Param('userId') userId: string,
    @Body() createProfileDto: CreateProfileDto,
    @Req() req,
  ) {
    if (!(await this.canAccess(userId, req))) {
      throw new ForbiddenException();
    }

    return this.profileService.createProfile(userId, createProfileDto);
  }

  @Patch()
  @ApiOperation({
    summary: 'Update a profile',
    description:
      'Updates the profile of a specific user. Only the user or an admin can update their profile.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'Unique identifier of the user',
  })
  @ApiBody({ type: CreateProfileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully.',
    type: Profile,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not authorized to update this profile.',
  })
  async update(
    @Param('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req,
  ) {
    if (!(await this.canAccess(userId, req))) {
      throw new ForbiddenException();
    }

    return this.profileService.updateProfile(userId, updateProfileDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get a profile',
    description:
      'Retrieves the profile of a specific user. Only the user or an admin can view this profile.',
  })
  @ApiParam({
    name: 'userId',
    type: String,
    description: 'Unique identifier of the user',
  })
  @ApiOkResponse({
    description: 'Profile retrieved successfully.',
    type: Profile,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User is not authorized to view this profile.',
  })
  async findOne(@Param('userId') userId: string, @Req() req) {
    if (!(await this.canAccess(userId, req))) {
      throw new ForbiddenException();
    }

    return this.profileService.getProfileByUserId(userId);
  }

  private async canAccess(userId: string, req): Promise<boolean> {
    const { sub: currentUserId, role, academyId } = req.user;

    // ✅ allow if user is acting on their own profile
    if (userId === currentUserId) return true;

    // ✅ allow if user is ADMIN
    if (role === UserRole.ADMIN) return true;

    // ✅ allow if user is ACCOUNT_ADMIN but only within same academy
    if (role === UserRole.ACADEMY_ADMIN) {
      const targetUser = await this.userService.findOne(userId);

      if (!targetUser) return false;

      return targetUser.academy?.id === academyId;
    }

    return false;
  }
}
