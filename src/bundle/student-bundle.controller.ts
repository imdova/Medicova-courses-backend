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
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Student Bundles')
@Controller('student/bundles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class StudentBundleController {
  constructor(private readonly bundleService: StudentBundleService) { }

  @Get()
  @RequirePermissions('bundle:list_available')
  @ApiOperation({ summary: 'Get all available bundles for a student' })
  @ApiResponse({ status: 200, description: 'List of bundles' })
  async findAll(@Req() req) {
    return this.bundleService.getAvailableBundles(req.user);
  }

  @Post(':id/enroll')
  @RequirePermissions('bundle:enroll')
  @ApiOperation({ summary: 'Enroll student into a bundle' })
  @ApiParam({ name: 'id', description: 'Bundle UUID' })
  async enroll(@Param('id', ParseUUIDPipe) id: string, @Req() req) {
    return this.bundleService.enrollStudentInBundle(id, req.user);
  }
}
