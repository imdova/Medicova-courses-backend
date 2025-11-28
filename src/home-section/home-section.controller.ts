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
  Req,
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
import { OptionalJwtAuthGuard } from '../auth/strategy/optional-jwt-auth.guard';

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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get featured courses with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Featured courses with instructor and stats',
  })
  async getPublicFeaturedCourses(@Req() req) {
    const userId = req.user?.sub; // Will be undefined if user is not authenticated
    return this.homeSectionsService.getPublicFeaturedCourses(userId);
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

  @Get('public/promo-cards')
  @ApiOperation({ summary: 'Get promo cards with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Promo cards with card details',
  })
  async getPublicPromoCards() {
    return this.homeSectionsService.getPublicPromoCards();
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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get bestseller courses with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Bestseller courses with instructor and stats',
  })
  async getPublicBestseller(@Req() req) {
    const userId = req.user?.sub; // Will be undefined if user is not authenticated
    return this.homeSectionsService.getPublicBestseller(userId);
  }

  @Get('public/top-rated')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get top rated courses with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Top rated courses with instructor and stats',
  })
  async getPublicTopRated(@Req() req) {
    const userId = req.user?.sub; // Will be undefined if user is not authenticated
    return this.homeSectionsService.getPublicTopRated(userId);
  }

  @Get('public/top-bundles')
  @ApiOperation({ summary: 'Get top bundles with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Top bundles with bundle details and stats',
  })
  async getPublicTopBundles() {
    return this.homeSectionsService.getPublicTopBundles();
  }

  @Get('public/top-academies')
  @ApiOperation({ summary: 'Get top academies with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Top academies with bundle details and stats',
  })
  async getPublicTopAcademies() {
    return this.homeSectionsService.getPublicTopAcademies();
  }

  // In home-section.controller.ts
  @Get('public/top-instructors')
  @ApiOperation({ summary: 'Get top instructors with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Top instructors with profile details, courses, and stats',
  })
  async getPublicTopInstructors() {
    return this.homeSectionsService.getPublicTopInstructors();
  }

  @Get('public/training-courses-cards')
  @ApiOperation({ summary: 'Get training courses cards with enriched data (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Training Courses Cards with card details',
  })
  async getPublicTrainingCoursesCards() {
    return this.homeSectionsService.getTrainingCoursesCards();
  }
}