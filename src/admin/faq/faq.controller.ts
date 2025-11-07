// src/faq/faq.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, DefaultValuePipe, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard'; // Assuming location
import { RequirePermissions } from 'src/auth/decorator/permission.decorator'; // Assuming location
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto'; // Assuming combined DTO file
import { Faq, FaqCategory, FaqStatus } from './entities/faq.entity'; // Assuming location
import { UpdateFaqDto } from './dto/update-faq.dto';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

@ApiTags('FAQ Management (Admin)')
@ApiBearerAuth('access_token') // Links to global JWT scheme defined in main.ts
@Controller('faqs')
export class FaqController {
  constructor(private readonly faqService: FaqService) { }

  // -----------------------------------------------------------------
  // CREATE
  // -----------------------------------------------------------------
  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('faq:create')
  @ApiOperation({ summary: 'Create a new FAQ entry' })
  @ApiResponse({ status: 201, description: 'FAQ created successfully.', type: Faq })
  async create(@Body() createFaqDto: CreateFaqDto): Promise<Faq> {
    // Assuming req.user.sub holds the UUID of the admin user
    return this.faqService.create(createFaqDto);
  }

  // -----------------------------------------------------------------
  // LIST (PAGINATED)
  // -----------------------------------------------------------------
  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('faq:list')
  @ApiOperation({ summary: 'Get a paginated list of all FAQs with filtering and searching' })
  @ApiResponse({ status: 200, description: 'List of FAQs retrieved successfully.' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Global search term applied to question fields (EN/AR).',
    example: 'refund',
  })
  @ApiQuery({
    name: 'filter.category',  // ✅ Changed from filter[category] to filter.category
    required: false,
    enum: FaqCategory,
    description: `Filter by FAQ category. Options: ${Object.values(FaqCategory).join(', ')}`,
    example: FaqCategory.SHIPPING,
  })
  @ApiQuery({
    name: 'filter.status',  // ✅ Changed from filter[status] to filter.status
    required: false,
    enum: FaqStatus,
    description: `Filter by status. Options: ${Object.values(FaqStatus).join(', ')}`,
    example: FaqStatus.PUBLISHED,
  })
  findAll(
    @Paginate() query: PaginateQuery,
  ): Promise<any> {
    return this.faqService.findAll(query);
  }

  // -----------------------------------------------------------------
  // READ ONE
  // -----------------------------------------------------------------
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('faq:read')
  @ApiOperation({ summary: 'Get a single FAQ by ID' })
  @ApiResponse({ status: 200, description: 'FAQ retrieved successfully.', type: Faq })
  @ApiResponse({ status: 404, description: 'FAQ not found.' })
  findOne(@Param('id') id: string) {
    // Use string for UUID
    return this.faqService.findOne(id);
  }

  // -----------------------------------------------------------------
  // UPDATE
  // -----------------------------------------------------------------
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('faq:update')
  @ApiOperation({ summary: 'Update an existing FAQ by ID' })
  @ApiResponse({ status: 200, description: 'FAQ updated successfully.' })
  @ApiResponse({ status: 404, description: 'FAQ not found.' })
  update(@Param('id') id: string, @Body() updateFaqDto: CreateFaqDto) {
    // Use string for UUID
    return this.faqService.update(id, updateFaqDto);
  }

  // -----------------------------------------------------------------
  // DELETE (Soft Delete)
  // -----------------------------------------------------------------
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('faq:delete')
  @ApiOperation({ summary: 'Soft delete an FAQ by ID' })
  @ApiResponse({ status: 200, description: 'FAQ deleted successfully.' })
  @ApiResponse({ status: 404, description: 'FAQ not found.' })
  remove(@Param('id') id: string) {
    // Use string for UUID
    return this.faqService.remove(id);
  }
}