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
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Profile Categories')
@Controller('profile-categories')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class ProfileCategoryController {
  constructor(
    private readonly profileCategoryService: ProfileCategoryService,
  ) { }

  @Post()
  @RequirePermissions('profile_category:create')
  @ApiOperation({ summary: 'Create a new profile category with specialities' })
  @ApiBody({ type: CreateProfileCategoryDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Category created' })
  create(@Body() dto: CreateProfileCategoryDto, @Req() req) {
    return this.profileCategoryService.create(dto, req.user.sub);
  }

  @Get()
  @RequirePermissions('profile_category:list')
  @ApiOperation({ summary: 'Get all categories with specialities' })
  @ApiResponse({ status: HttpStatus.OK })
  findAll() {
    return this.profileCategoryService.findAll();
  }

  @Get(':id')
  @RequirePermissions('profile_category:get')
  @ApiOperation({ summary: 'Get one category with its specialities' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: HttpStatus.OK })
  findOne(@Param('id') id: string) {
    return this.profileCategoryService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('profile_category:update')
  @ApiBody({ type: CreateProfileCategoryDto })
  @ApiOperation({ summary: 'Update a category' })
  update(@Param('id') id: string, @Body() dto: UpdateProfileCategoryDto) {
    return this.profileCategoryService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermissions('profile_category:delete')
  @ApiOperation({ summary: 'Delete a category' })
  remove(@Param('id') id: string) {
    return this.profileCategoryService.remove(id);
  }

  // ✅ Add speciality to category
  @Post(':id/specialities')
  @RequirePermissions('speciality:add')
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
  @RequirePermissions('speciality:remove')
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
