import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
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

@ApiTags('Academies')
@Controller('academies')
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
}
