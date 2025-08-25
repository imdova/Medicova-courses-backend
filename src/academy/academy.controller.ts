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
import { UserRole } from 'src/user/entities/user.entity';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

@ApiTags('Academies')
@Controller('academies')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Post()
  @Roles(UserRole.ADMIN)
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
  create(@Body() createAcademyDto: CreateAcademyDto) {
    return this.academyService.create(createAcademyDto);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all academies (admin only)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all academies' })
  findAll() {
    return this.academyService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
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
    if (req.user.role === UserRole.ACCOUNT_ADMIN) {
      if (req.user.academyId !== id) {
        throw new ForbiddenException(
          'You are not allowed to access this academy',
        );
      }
    }
    return this.academyService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
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
    if (req.user.role === UserRole.ACCOUNT_ADMIN) {
      if (req.user.academyId !== id) {
        throw new ForbiddenException(
          'You are not allowed to edit this academy',
        );
      }
    }
    return this.academyService.update(id, updateAcademyDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
  @ApiOperation({ summary: 'Delete an academy by ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Academy deleted successfully',
  })
  remove(@Param('id') id: string, @Req() req) {
    if (req.user.role === UserRole.ACCOUNT_ADMIN) {
      if (req.user.academyId !== id) {
        throw new ForbiddenException(
          'You are not allowed to delete this academy',
        );
      }
    }
    return this.academyService.remove(id);
  }

  // ---------- New endpoint to add a user under this academy ----------
  @Post(':id/users')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
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
    if (req.user.role === UserRole.ACCOUNT_ADMIN) {
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
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
  @ApiOperation({ summary: 'Get all users under a specific academy' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users under the academy',
  })
  async getUsersInAcademy(@Param('id') academyId: string, @Req() req) {
    if (req.user.role === UserRole.ACCOUNT_ADMIN) {
      if (req.user.academyId !== academyId) {
        throw new ForbiddenException(
          'You are not allowed to access users of this academy',
        );
      }
    }
    return this.academyService.getUsersInAcademy(academyId);
  }
}
