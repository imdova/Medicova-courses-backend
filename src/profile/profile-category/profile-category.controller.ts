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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ProfileCategoryService } from './profile-category.service';
import { CreateProfileCategoryDto } from './dto/create-profile-category.dto';
import { UpdateProfileCategoryDto } from './dto/update-profile-category.dto';
import { RolesGuard } from 'src/auth/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/user/entities/user.entity';

@ApiTags('Profile Categories')
@Controller('profile-categories')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN) // ✅ Only admins can use these endpoints
export class ProfileCategoryController {
  constructor(
    private readonly profileCategoryService: ProfileCategoryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new profile category with specialities' })
  @ApiBody({ type: CreateProfileCategoryDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created' })
  create(@Body() dto: CreateProfileCategoryDto, @Req() req) {
    return this.profileCategoryService.create(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories with specialities' })
  @ApiResponse({ status: HttpStatus.OK })
  findAll() {
    return this.profileCategoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one category with its specialities' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK })
  findOne(@Param('id') id: string) {
    return this.profileCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiBody({ type: CreateProfileCategoryDto })
  @ApiOperation({ summary: 'Update a category' })
  update(@Param('id') id: string, @Body() dto: UpdateProfileCategoryDto) {
    return this.profileCategoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  remove(@Param('id') id: string) {
    return this.profileCategoryService.remove(id);
  }

  // ✅ Add speciality to category
  @Post(':id/specialities')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        specialities: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Add a speciality to a category' })
  addSpeciality(
    @Param('id') categoryId: string,
    @Body('specialities') specialities: string[],
  ) {
    return this.profileCategoryService.addSpecialities(
      categoryId,
      specialities,
    );
  }

  // ✅ Remove speciality from category
  @Delete(':id/specialities')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        specialitiesIds: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Remove a speciality from a category' })
  removeSpeciality(
    @Param('id') categoryId: string,
    @Body('specialitiesIds') specialityIds: string[],
  ) {
    return this.profileCategoryService.removeSpecialities(
      categoryId,
      specialityIds,
    );
  }
}
