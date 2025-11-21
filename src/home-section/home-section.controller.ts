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
import { HomeSection, HomeSectionType } from './entities/home-section.entity';
import { CreateHomeSectionDto } from './dto/create-home-section.dto';
import { UpdateHomeSectionDto } from './dto/update-home-section.dto';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../auth/permission.guard';
import { RequirePermissions } from '../auth/decorator/permission.decorator';

@ApiBearerAuth('access_token')
@ApiTags('Home Sections')
@Controller('home-sections')
export class HomeSectionController {
  constructor(private readonly homeSectionsService: HomeSectionService) { }

  // @Get()
  // @ApiOperation({ summary: 'Get all home sections' })
  // findAll() {
  //   return this.homeSectionsService.findAll();
  // }

  @Get(':sectionType')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('home_sections:get_by_type')
  @ApiOperation({ summary: 'Get a specific home section' })
  findByType(@Param('sectionType') sectionType: HomeSectionType) {
    return this.homeSectionsService.findByType(sectionType);
  }

  @Put(':sectionType')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('home_sections:put')
  @ApiOperation({ summary: 'Update a home section' })
  update(
    @Param('sectionType') sectionType: HomeSectionType,
    @Body() updateHomeSectionDto: UpdateHomeSectionDto,
  ) {
    return this.homeSectionsService.update(sectionType, updateHomeSectionDto);
  }

  // @Get('content/available-courses')
  // @ApiOperation({ summary: 'Get available courses for sections' })
  // getAvailableCourses(@Query('search') search?: string) {
  //   return this.homeSectionsService.getAvailableCourses(search);
  // }

  // @Get('content/available-categories')
  // @ApiOperation({ summary: 'Get available categories for sections' })
  // getAvailableCategories(@Query('search') search?: string) {
  //   return this.homeSectionsService.getAvailableCategories(search);
  // }

  @Get('public/featured-courses')
  @ApiOperation({ summary: 'Get featured courses with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Featured courses with instructor and stats',
  })
  async getPublicFeaturedCourses() {
    return this.homeSectionsService.getPublicFeaturedCourses();
  }

  @Get('public/trending')
  @ApiOperation({ summary: 'Get trending section with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Trending section with promo cards and enriched courses',
  })
  async getPublicTrending() {
    return this.homeSectionsService.getPublicTrending();
  }

  @Get('public/category-showcase')
  @ApiOperation({ summary: 'Get category showcase with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Category showcase with category details and course counts',
  })
  async getPublicCategoryShowcase() {
    return this.homeSectionsService.getPublicCategoryShowcase();
  }

  @Get('public/bestseller')
  @ApiOperation({ summary: 'Get bestseller courses with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Bestseller courses with instructor and stats',
  })
  async getPublicBestseller() {
    return this.homeSectionsService.getPublicBestseller();
  }

  @Get('public/top-rated')
  @ApiOperation({ summary: 'Get top rated courses with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Top rated courses with instructor and stats',
  })
  async getPublicTopRated() {
    return this.homeSectionsService.getPublicTopRated();
  }
}