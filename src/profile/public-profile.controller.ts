import { Controller, Get, Param, UseGuards, Patch, Post, HttpStatus, Req, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { Profile } from 'src/profile/entities/profile.entity';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { RateProfileDto } from './dto/rate-profile.dto';
import { ProfileRating } from './entities/profile-rating.entity';

@ApiTags('Public Instructor Profile')
@Controller('public/profiles')
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

  @UseGuards(AuthGuard('jwt'))
  @Post('instructor/:profileId/rate')
  @ApiOperation({
    summary: 'Rate an instructor profile',
    description:
      'Allows any authenticated user to give a rating (1–5) and an optional review for an instructor profile. If the user already rated, their rating will be updated.',
  })
  @ApiParam({
    name: 'profileId',
    type: String,
    description: 'ID of the instructor profile',
  })
  @ApiBody({ type: RateProfileDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Rating successfully created or updated.',
    type: ProfileRating,
  })
  async rateProfile(
    @Param('profileId') profileId: string,
    @Req() req,
    @Body() dto: RateProfileDto,
  ) {
    return this.profileService.rateProfile(req.user.sub, profileId, dto);
  }

  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('instructor_profile:set_private')
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
