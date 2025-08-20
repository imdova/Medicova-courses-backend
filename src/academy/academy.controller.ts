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
@Roles(UserRole.ACCOUNT_ADMIN)
export class AcademyController {
  constructor(private readonly academyService: AcademyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new academy' })
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
  @ApiOperation({ summary: 'List all academies' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of all academies' })
  findAll() {
    return this.academyService.findAll();
  }

  @Get(':id')
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
  findOne(@Param('id') id: string) {
    return this.academyService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an academy by ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiBody({ description: 'Academy update data', type: UpdateAcademyDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Academy updated successfully',
  })
  update(@Param('id') id: string, @Body() updateAcademyDto: UpdateAcademyDto) {
    return this.academyService.update(id, updateAcademyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an academy by ID' })
  @ApiParam({ name: 'id', type: String, description: 'ID of the academy' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Academy deleted successfully',
  })
  remove(@Param('id') id: string) {
    return this.academyService.remove(id);
  }

  // ---------- New endpoint to add a user under this academy ----------
  @Post(':id/users')
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
  ) {
    return this.academyService.addUserToAcademy(academyId, createUserDto);
  }
}
