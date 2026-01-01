import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CoursePricingService } from './course-pricing.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CreateCoursePricingDto } from './dto/create-course-pricing.dto';
import { UpdateCoursePricingDto } from './dto/update-course-pricing.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Course Pricing')
@ApiBearerAuth('access_token')
@Controller('courses/:courseId/pricing')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CoursePricingController {
  constructor(private readonly pricingService: CoursePricingService) { }

  @Post()
  @RequirePermissions('pricing:add')
  @ApiOperation({ summary: 'Add pricing for a course' })
  @ApiResponse({
    status: 201,
    description: 'Pricing added',
    type: CreateCoursePricingDto,
  })
  createPricing(
    @Param('courseId') courseId: string,
    @Body() dto: CreateCoursePricingDto,
  ) {
    return this.pricingService.createPricing(courseId, dto);
  }

  @Get()
  @RequirePermissions('pricing:list')
  @ApiOperation({ summary: 'Get all pricing for a course' })
  @ApiResponse({ status: 200, type: [CreateCoursePricingDto] })
  getPricing(@Param('courseId') courseId: string) {
    return this.pricingService.getPricingByCourse(courseId);
  }

  @Patch(':pricingId')
  @RequirePermissions('pricing:update')
  @ApiOperation({ summary: 'Update course pricing' })
  @ApiBody({ type: CreateCoursePricingDto })
  @ApiResponse({ status: 200, type: CreateCoursePricingDto })
  updatePricing(
    @Param('pricingId') pricingId: string,
    @Body() dto: UpdateCoursePricingDto,
  ) {
    return this.pricingService.updatePricing(pricingId, dto);
  }

  @Delete(':pricingId')
  @RequirePermissions('pricing:deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate course pricing' })
  async deletePricing(@Param('pricingId') pricingId: string) {
    await this.pricingService.softDeletePricing(pricingId);
  }
}
