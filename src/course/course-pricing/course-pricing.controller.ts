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
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateCoursePricingDto } from './dto/create-course-pricing.dto';
import { UpdateCoursePricingDto } from './dto/update-course-pricing.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Course Pricing')
@Controller('courses/:courseId/pricing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
export class CoursePricingController {
  constructor(private readonly pricingService: CoursePricingService) {}

  @Post()
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
  @ApiOperation({ summary: 'Get all pricing for a course' })
  @ApiResponse({ status: 200, type: [CreateCoursePricingDto] })
  getPricing(@Param('courseId') courseId: string) {
    return this.pricingService.getPricingByCourse(courseId);
  }

  @Patch(':pricingId')
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
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate course pricing' })
  async deletePricing(@Param('pricingId') pricingId: string) {
    await this.pricingService.softDeletePricing(pricingId);
  }
}
