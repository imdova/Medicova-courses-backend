// src/faq/faq.controller.ts

import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, DefaultValuePipe, ParseIntPipe, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/auth/permission.guard'; // Assuming location
import { RequirePermissions } from 'src/auth/decorator/permission.decorator'; // Assuming location
import { FaqService } from './faq.service';
import { CreateFaqDto } from './dto/create-faq.dto'; // Assuming combined DTO file
import { Faq } from './entities/faq.entity'; // Assuming location
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
  //@RequirePermissions('faq:create')
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
  //@RequirePermissions('faq:list')
  @ApiOperation({ summary: 'Get a paginated list of all FAQs with filtering and searching' })
  @ApiResponse({ status: 200, description: 'List of FAQs retrieved successfully.' })
  findAll(
    // ✅ Use the generic @Paginate decorator
    @Paginate() query: PaginateQuery,
  ): Promise<any> {
    // Pass the standardized PaginateQuery object to the service
    return this.faqService.findAll(query);
  }

  // -----------------------------------------------------------------
  // READ ONE
  // -----------------------------------------------------------------
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('faq:read')
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
  //@RequirePermissions('faq:update')
  @ApiOperation({ summary: 'Update an existing FAQ by ID' })
  @ApiResponse({ status: 200, description: 'FAQ updated successfully.' })
  @ApiResponse({ status: 404, description: 'FAQ not found.' })
  update(@Param('id') id: string, @Body() updateFaqDto: UpdateFaqDto) {
    // Use string for UUID
    return this.faqService.update(id, updateFaqDto);
  }

  // -----------------------------------------------------------------
  // DELETE (Soft Delete)
  // -----------------------------------------------------------------
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('faq:delete')
  @ApiOperation({ summary: 'Soft delete an FAQ by ID' })
  @ApiResponse({ status: 200, description: 'FAQ deleted successfully.' })
  @ApiResponse({ status: 404, description: 'FAQ not found.' })
  remove(@Param('id') id: string) {
    // Use string for UUID
    return this.faqService.remove(id);
  }
}