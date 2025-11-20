import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { HomeSectionService } from './home-section.service';
import { HomeSection, HomeSectionType, ContentType } from './entities/home-section.entity';
import { CreateHomeSectionDto } from './dto/create-home-section.dto';
import { UpdateHomeSectionDto } from './dto/update-home-section.dto';
import { UpdateSectionOrderDto } from './dto/update-section-order.dto';
import { BulkUpdateSectionsDto } from './dto/bulk-update-sections.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/decorator/permission.decorator';

@ApiBearerAuth('access_token')
@ApiTags('Home Sections')
@Controller('home-sections')
export class HomeSectionController {
  constructor(private readonly homeSectionsService: HomeSectionService) { }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('home_sections:create')
  @ApiOperation({ summary: 'Add an item to a home section' })
  @ApiResponse({
    status: 201,
    description: 'Item added to home section',
    type: HomeSection,
  })
  create(@Body() createHomeSectionDto: CreateHomeSectionDto) {
    return this.homeSectionsService.create(createHomeSectionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all home sections with their items' })
  @ApiResponse({
    status: 200,
    description: 'All home sections data',
  })
  findAll() {
    return this.homeSectionsService.findAllSections();
  }

  @Get('section/:type')
  @ApiOperation({ summary: 'Get items for a specific section type' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive items'
  })
  @ApiResponse({
    status: 200,
    description: 'Section items',
    type: [HomeSection],
  })
  findBySectionType(
    @Param('type') type: HomeSectionType,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.homeSectionsService.findBySectionType(type, includeInactive === true);
  }

  @Get('available-content')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('home_sections:create')
  @ApiOperation({ summary: 'Get available content for a section type and content type' })
  @ApiQuery({ name: 'sectionType', enum: HomeSectionType, required: true })
  @ApiQuery({ name: 'contentType', enum: ContentType, required: true })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({
    status: 200,
    description: 'List of available content',
  })
  getAvailableContent(
    @Query('sectionType') sectionType: HomeSectionType,
    @Query('contentType') contentType: ContentType,
    @Query('search') search?: string,
  ) {
    return this.homeSectionsService.getAvailableContent(sectionType, contentType, search);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('home_sections:read')
  @ApiOperation({ summary: 'Get a specific home section item' })
  @ApiResponse({
    status: 200,
    description: 'Home section item details',
    type: HomeSection,
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.homeSectionsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('home_sections:update')
  @ApiOperation({ summary: 'Update a home section item' })
  @ApiResponse({
    status: 200,
    description: 'Home section item updated',
    type: HomeSection,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateHomeSectionDto: UpdateHomeSectionDto,
  ) {
    return this.homeSectionsService.update(id, updateHomeSectionDto);
  }

  @Put('order/update')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('home_sections:update')
  @ApiOperation({ summary: 'Update the order of items in a section' })
  @ApiResponse({
    status: 200,
    description: 'Section order updated',
    type: [HomeSection],
  })
  updateOrder(@Body() updateOrderDto: UpdateSectionOrderDto) {
    return this.homeSectionsService.updateSectionOrder(updateOrderDto);
  }

  @Put('bulk-update')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('home_sections:update')
  @ApiOperation({ summary: 'Bulk update all items in a section (replace existing)' })
  @ApiResponse({
    status: 200,
    description: 'Section bulk updated',
    type: [HomeSection],
  })
  bulkUpdate(@Body() bulkUpdateDto: BulkUpdateSectionsDto) {
    return this.homeSectionsService.bulkUpdateSections(bulkUpdateDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  //@RequirePermissions('home_sections:delete')
  @ApiOperation({ summary: 'Remove an item from home section' })
  @ApiResponse({
    status: 200,
    description: 'Item removed from home section',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.homeSectionsService.remove(id);
  }
}