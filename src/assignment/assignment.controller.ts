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
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'src/user/entities/user.entity';

@ApiTags('Assignments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
  @ApiOperation({ summary: 'Create a new assignment (instructors & admins)' })
  @ApiBody({ type: CreateAssignmentDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Assignment created',
  })
  create(@Body() dto: CreateAssignmentDto, @Req() req) {
    return this.assignmentService.create(dto, req.user.sub);
  }

  @Get()
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
  @ApiOperation({
    summary:
      'List assignments (instructors: only their own; admins: all assignments)',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of assignments' })
  findAll(@Req() req) {
    return this.assignmentService.findAllForUser(req.user.sub, req.user.role);
  }

  @Get(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
  @ApiOperation({
    summary:
      'Get assignment by ID (instructor must be the creator; admins see any)',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not found' })
  findOne(@Param('id') id: string, @Req() req) {
    return this.assignmentService.findOneForUser(
      id,
      req.user.sub,
      req.user.role,
    );
  }

  @Patch(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
  @ApiOperation({
    summary:
      'Update assignment (instructor only their own; admins can update any)',
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
    );
  }

  @Delete(':id')
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.ACCOUNT_ADMIN)
  @ApiOperation({
    summary:
      'Delete assignment (instructor only their own; admins can delete any)',
  })
  @ApiParam({ name: 'id', description: 'Assignment ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Assignment deleted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Not allowed' })
  remove(@Param('id') id: string, @Req() req) {
    return this.assignmentService.removeForUser(
      id,
      req.user.sub,
      req.user.role,
    );
  }
}
