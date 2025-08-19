import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiOkResponse } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { InstructorProfile } from 'src/profile/instructor-profile/entities/instructor-profile.entity';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Public Instructor Profile')
@Controller('public/profiles')
@UseGuards(AuthGuard('jwt'))
export class PublicProfileController {
    constructor(private readonly profileService: ProfileService) { }

    @Get('username/:userName')
    @ApiOperation({
        summary: 'Get profile by username',
        description: 'Public endpoint. Fetches a profile by username.',
    })
    @ApiParam({ name: 'userName', type: String })
    @ApiOkResponse({ type: InstructorProfile })
    async getInstructorByUsername(@Param('userName') userName: string) {
        return this.profileService.getInstructorProfileByUsername(userName);
    }
}
