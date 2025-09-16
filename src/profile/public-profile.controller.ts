import { Controller, Get, Param, UseGuards, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { Profile } from 'src/profile/entities/profile.entity';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@ApiTags('Public Instructor Profile')
@Controller('public/profiles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PublicProfileController {
  constructor(private readonly profileService: ProfileService) { }

  @Get('instructor/username/:userName')
  @ApiOperation({
    summary: 'Get instructor profile by username',
    description: 'Public endpoint. Fetches an instructor profile by username.',
  })
  @ApiParam({ name: 'userName', type: String })
  @ApiOkResponse({ type: Profile })
  async getInstructorByUsername(@Param('userName') userName: string) {
    return this.profileService.getInstructorProfileByUsername(userName);
  }

  //@Roles(UserRole.ADMIN)
  @Patch('instructor/make-all-private')
  @ApiOperation({
    summary: 'Set all instructor profiles to private',
    description:
      'Admin-only endpoint. Forces all instructor profiles to have isPublic = false.',
  })
  async makeAllProfilesPrivate() {
    await this.profileService.makeAllInstructorProfilesPrivate();
    return {
      success: true,
      message: 'All instructor profiles are now private',
    };
  }
}
