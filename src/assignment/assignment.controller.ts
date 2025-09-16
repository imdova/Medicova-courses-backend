import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@ApiTags('Assignments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) { }

  @Post()
  //@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACADEMY_USER, UserRole.ACADEMY_ADMIN)
  @ApiOperation({
    summary: 'Create a new assignment (instructors, academy content creator & admins)',
  })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assignment created',
  })
  create(@Body() dto: CreateAssignmentDto, @Req() req) {
    return this.assignmentService.create(dto, req.user.sub, req.user.academyId);
  }

  @Get()
  //@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACADEMY_USER, UserRole.ACADEMY_ADMIN)
  @ApiOperation({
    summary:
      'List assignments (instructors: their own; academy content creators: their academy; admins: all)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of assignments' })
  findAll(@Req() req) {
    return this.assignmentService.findAllForUser(req.user.sub, req.user.role, req.user.academyId);
  }

  @Get(':id')
  //@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACADEMY_USER, UserRole.ACADEMY_ADMIN)
  @ApiOperation({
    summary:
      'Get assignment by ID (instructors: only their own; academy content creators: same academy; admins: any)',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not found' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.assignmentService.findOneForUser(
      id,
      req.user.sub,
      req.user.role,
      req.user.academyId
    );
  }

  @Patch(':id')
  //@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACADEMY_USER, UserRole.ACADEMY_ADMIN)
  @ApiOperation({
    summary:
      'Update assignment (instructors: only their own; academy content creators: same academy; admins: any',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiBody({ type: UpdateAssignmentDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment updated' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not allowed' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
    @Req() req,
  ) {
    return this.assignmentService.updateForUser(
      id,
      dto,
      req.user.sub,
      req.user.role,
      req.user.academyId
    );
  }

  @Delete(':id')
  //@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACADEMY_USER, UserRole.ACADEMY_ADMIN)
  @ApiOperation({
    summary:
      'Delete assignment (instructors: only their own; academy content creators: same academy; admins: any',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment deleted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not allowed' })
  remove(@Param('id') id: string, @Req() req) {
    return this.assignmentService.removeForUser(
      id,
      req.user.sub,
      req.user.role,
      req.user.academyId
    );
  }
}
