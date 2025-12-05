// src/testimonials/testimonial.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { TestimonialService } from './testimonial.service';
import { Testimonial } from './entities/testimonial.entity';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@ApiTags('Testimonials')
@Controller('testimonials')
@ApiBearerAuth('access_token')
export class TestimonialController {
  constructor(private readonly testimonialsService: TestimonialService) { }

  // -------------------------------------------------------------------
  // PUBLIC ENDPOINTS
  // -------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'Get a paginated list of all published testimonials (Public access).' })
  @ApiResponse({ status: 200, type: Testimonial, isArray: true })
  findAllPublic(@Paginate() query: PaginateQuery) {
    return this.testimonialsService.findAllPublished(query);
  }

  // -------------------------------------------------------------------
  // USER SUBMISSION ENDPOINT (Requires basic authentication)
  // -------------------------------------------------------------------

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @ApiOperation({ summary: 'Submit a new testimonial (Client access).' })
  @ApiResponse({ status: 201, type: Testimonial })
  create(@Req() req, @Body() createTestimonialDto: CreateTestimonialDto) {
    const userId = req.user.sub;
    return this.testimonialsService.create(userId, createTestimonialDto);
  }

  // -------------------------------------------------------------------
  // ADMIN ENDPOINTS (Require authentication and permissions)
  // -------------------------------------------------------------------

  @Get('/admin')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('testimonial:list')
  @ApiOperation({ summary: 'Admin: Get a paginated list of ALL testimonials (including DRAFT/ARCHIVED).' })
  @ApiResponse({ status: 200, type: Testimonial, isArray: true })
  findAllAdmin(@Query() query: PaginateQuery) {
    return this.testimonialsService.findAllAdmin(query);
  }

  @Get('/admin/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('testimonial:read')
  @ApiOperation({ summary: 'Admin: Get a single testimonial by ID.' })
  @ApiResponse({ status: 200, type: Testimonial })
  findOne(@Param('id') id: string) {
    return this.testimonialsService.findOne(id);
  }

  @Patch('/admin/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('testimonial:update')
  @ApiOperation({ summary: 'Admin: Update a testimonial (content, status, etc.).' })
  @ApiResponse({ status: 200, type: Testimonial })
  update(@Param('id') id: string, @Body() updateTestimonialDto: UpdateTestimonialDto) {
    return this.testimonialsService.update(id, updateTestimonialDto);
  }

  @Delete('/admin/:id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('testimonial:delete')
  @ApiOperation({ summary: 'Admin: Soft delete a testimonial.' })
  @ApiResponse({ status: 200, description: 'Testimonial successfully deleted.' })
  remove(@Param('id') id: string) {
    return this.testimonialsService.remove(id);
  }
}