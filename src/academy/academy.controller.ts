import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { AcademyService } from './academy.service';
import { CreateAcademyDto } from './dto/create-academy.dto';
import { UpdateAcademyDto } from './dto/update-academy.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { CreateAcademyInstructorDto } from './dto/create-academy-instructor.dto';
import { UpdateAcademyInstructorDto } from './dto/update-academy-instructor.dto';
import { Academy } from './entities/academy.entity';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';
import { CreateAcademyKeywordDto } from './dto/create-academy-keyword.dto';

@ApiTags('Academies')
@Controller('academies')
export class AcademyController {
  constructor(private readonly academyService: AcademyService) { }

  @Post()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy:create')
  @ApiOperation({ summary: 'Create a new academy (admin only)' })
  @ApiBody({ description: 'Academy details', type: CreateAcademyDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Academy successfully created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  create(@Body() createAcademyDto: CreateAcademyDto, @Req() req) {
    const userId = req.user.sub;
    const email = req.user.email;
    return this.academyService.create(createAcademyDto, userId, email);
  }

  // ---------- Admin: Add new academy keyword ----------
  @Post('keywords')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy_keyword:create')
  @ApiOperation({ summary: 'Create a new academy keyword (admin only)' })
  @ApiBody({ description: 'Keyword details', type: CreateAcademyKeywordDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Keyword successfully created',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Keyword already exists or invalid data',
  })
  createKeyword(@Body() dto: CreateAcademyKeywordDto) {
    return this.academyService.createKeyword(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy:list')
  @ApiOperation({ summary: 'List all academies (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all academies' })
  findAll() {
    return this.academyService.findAll();
  }

  // ---------- Public: Get all available academy keywords ----------
  @Get('keywords')
  @ApiOperation({ summary: 'Get all active academy keywords (public)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of active academy keywords',
  })
  findAllKeywords() {
    return this.academyService.findAllKeywords();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy:get_by_id')
  @ApiOperation({ summary: 'Get an academy by ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Academy retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Academy not found',
  })
  findOne(@Param('id') id: string, @Req() req) {
    if (req.user.role === 'academy_admin') {
      if (req.user.academyId !== id) {
        throw new ForbiddenException(
          'You are not allowed to access this academy',
        );
      }
    }
    return this.academyService.findOne(id);
  }

  @Get('slug/:slug')
  // @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  // @RequirePermissions('academy:get_by_slug')
  @ApiOperation({ summary: 'Get an academy by Slug' })
  @ApiParam({ name: 'slug', description: 'Slug of academy' })
  @ApiResponse({
    status: 200,
    description: 'academy found',
    type: Academy,
  })
  @ApiResponse({ status: 404, description: 'Academy not found' })
  findOneBySlug(@Param('slug') slug: string) {
    return this.academyService.findOneBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy:update')
  @ApiOperation({ summary: 'Update an academy by ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiBody({ description: 'Academy update data', type: UpdateAcademyDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Academy updated successfully',
  })
  update(
    @Param('id') id: string,
    @Body() updateAcademyDto: UpdateAcademyDto,
    @Req() req,
  ) {
    if (req.user.role === 'academy_admin') {
      if (req.user.academyId !== id) {
        throw new ForbiddenException(
          'You are not allowed to edit this academy',
        );
      }
    }
    return this.academyService.update(id, updateAcademyDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy:delete')
  @ApiOperation({ summary: 'Delete an academy by ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Academy deleted successfully',
  })
  remove(@Param('id') id: string, @Req() req) {
    if (req.user.role === 'academy_admin') {
      if (req.user.academyId !== id) {
        throw new ForbiddenException(
          'You are not allowed to delete this academy',
        );
      }
    }
    return this.academyService.remove(id);
  }

  // ---------- New endpoint to add academy user under this academy ----------
  @Post(':id/users')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy_user:add')
  @ApiOperation({ summary: 'Add a new user under a specific academy' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiBody({ description: 'User details', type: CreateUserDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully added to academy',
  })
  addUserToAcademy(
    @Param('id') academyId: string,
    @Body() createUserDto: CreateUserDto,
    @Req() req,
  ) {
    if (req.user.role === 'academy_admin') {
      if (req.user.academyId !== academyId) {
        throw new ForbiddenException(
          'You are not allowed to add users to this academy',
        );
      }
    }
    return this.academyService.addUserToAcademy(academyId, createUserDto);
  }

  // ---------- New endpoint to get all users under an academy ----------
  @Get(':id/users')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy_user:list')
  @ApiOperation({ summary: 'Get all users under a specific academy' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users under the academy',
  })
  async getUsersInAcademy(@Param('id') academyId: string, @Req() req) {
    if (req.user.role === 'academy_admin') {
      if (req.user.academyId !== academyId) {
        throw new ForbiddenException(
          'You are not allowed to access users of this academy',
        );
      }
    }
    return this.academyService.getUsersInAcademy(academyId);
  }

  // ---------- New endpoint to add academy instructor ----------
  @Post(':id/instructors')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy_instructor:add')
  @ApiOperation({
    summary: 'Add an instructor profile under a specific academy (non-user)',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiBody({
    description: 'Instructor details',
    type: CreateAcademyInstructorDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Instructor successfully added to academy',
  })
  addInstructorToAcademy(
    @Param('id') academyId: string,
    @Body() createAcademyInstructorDto: CreateAcademyInstructorDto,
    @Req() req,
  ) {
    if (req.user.role === 'academy_admin') {
      if (req.user.academyId !== academyId) {
        throw new ForbiddenException(
          'You are not allowed to add instructors to this academy',
        );
      }
    }
    return this.academyService.addTeacherToAcademy(
      academyId,
      createAcademyInstructorDto,
    );
  }

  // ---------- New endpoint to get all instructors under an academy ----------
  @Get(':id/instructors')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy_instructor:list')
  @ApiOperation({
    summary: 'Get all instructor profiles under a specific academy (non-users)',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  async getInstructorsByAcademy(@Param('id') academyId: string, @Req() req) {
    if (
      ['academy_admin', 'academy_user'].includes(req.user.role)
    ) {
      if (req.user.academyId !== academyId) {
        throw new ForbiddenException(
          'You are not allowed to get instructors from this academy',
        );
      }
    }
    return this.academyService.findInstructors(academyId);
  }

  // ---------- New endpoint to get one instructor under an academy ----------
  @Get(':id/instructors/:instructorId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy_instructor:get')
  @ApiOperation({
    summary: 'Get One instructor profiles under a specific academy (non-users)',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiParam({
    name: 'instructorId',
    type: String,
    description: 'ID of the instructor',
  })
  async getInstructorByAcademy(
    @Param('id') academyId: string,
    @Param('instructorId') instructorId: string,
    @Req() req,
  ) {
    if (
      ['academy_admin', 'academy_user'].includes(req.user.role)
    ) {
      if (req.user.academyId !== academyId) {
        throw new ForbiddenException(
          'You are not allowed to get instructors from this academy',
        );
      }
    }
    return this.academyService.findOneInstructor(academyId, instructorId);
  }

  // ---------- New endpoint to update academy instructor ----------
  @Patch(':id/instructors/:instructorId')
  @UseGuards(AuthGuard('jwt'), PermissionsGuard)
  @RequirePermissions('academy_instructor:update')
  @ApiOperation({
    summary: 'Update an instructor profile under a specific academy (non-user)',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiParam({
    name: 'instructorId',
    type: String,
    description: 'ID of the instructor',
  })
  @ApiBody({
    description: 'Instructor update details',
    type: UpdateAcademyInstructorDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Instructor successfully updated',
  })
  async updateInstructorInAcademy(
    @Param('id') academyId: string,
    @Param('instructorId') instructorId: string,
    @Body() updateAcademyInstructorDto: UpdateAcademyInstructorDto,
    @Req() req,
  ) {
    if (req.user.role === 'academy_admin') {
      if (req.user.academyId !== academyId) {
        throw new ForbiddenException(
          'You are not allowed to update instructors in this academy',
        );
      }
    }
    return this.academyService.updateInstructor(
      academyId,
      instructorId,
      updateAcademyInstructorDto,
    );
  }
}
