import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StudentBundleService } from './student-bundle.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from 'src/user/entities/user.entity';
import { Roles } from 'src/auth/decorator/roles.decorator';

@ApiTags('Student Bundles')
@Controller('student/bundles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentBundleController {
  constructor(private readonly bundleService: StudentBundleService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available bundles for a student' })
  @ApiResponse({ status: 200, description: 'List of bundles' })
  async findAll(@Req() req) {
    return this.bundleService.getAvailableBundles(req.user);
  }

  @Post(':id/enroll')
  @ApiOperation({ summary: 'Enroll student into a bundle' })
  @ApiParam({ name: 'id', description: 'Bundle UUID' })
  async enroll(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.bundleService.enrollStudentInBundle(id, req.user);
  }
}
