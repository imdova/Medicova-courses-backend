import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { CourseSectionItemService } from './course-section-item.service';
import { CreateCourseSectionItemDto } from './dto/create-course-section-item.dto';
import { UpdateCourseSectionItemDto } from './dto/update-course-section-item.dto';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { CourseSectionItem } from './entities/course-section-item.entity';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../../auth/permission.guard';
import { RequirePermissions } from 'src/auth/decorator/permission.decorator';

@ApiTags('Course Section Items')
@Controller('course-sections/:sectionId/items')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class CourseSectionItemController {
  constructor(private readonly service: CourseSectionItemService) { }

  @Post()
  @RequirePermissions('section_item:add')
  @ApiOperation({
    summary: 'Add an item (lecture, quiz or assignment) to a section',
  })
  @ApiParam({ name: 'sectionId', description: 'UUID of the section' })
  @ApiBody({ type: CreateCourseSectionItemDto })
  @ApiResponse({
    status: 201,
    description: 'Item added successfully',
    type: CourseSectionItem,
  })
  addItem(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateCourseSectionItemDto,
  ) {
    return this.service.addItem(sectionId, dto);
  }

  @Post('bulk')
  @RequirePermissions('section_item:add_multiple')
  @ApiOperation({
    summary:
      'Add multiple items (lectures, quizzes or assignments) to a section',
  })
  @ApiBody({ type: [CreateCourseSectionItemDto] })
  bulkAddItems(
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: CreateCourseSectionItemDto[],
  ) {
    const itemsArray = Array.isArray(dto) ? dto : [dto];
    return this.service.bulkAddItems(sectionId, itemsArray);
  }

  @Patch(':itemId')
  @RequirePermissions('section_item:update')
  @ApiOperation({ summary: 'Update a section item (order, etc.)' })
  @ApiParam({ name: 'itemId', description: 'UUID of the section item' })
  @ApiBody({ type: UpdateCourseSectionItemDto })
  @ApiResponse({
    status: 200,
    description: 'Item updated successfully',
    type: CourseSectionItem,
  })
  updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCourseSectionItemDto,
  ) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete(':itemId')
  @RequirePermissions('section_item:delete')
  @ApiOperation({ summary: 'Soft delete a section item' })
  @ApiParam({ name: 'itemId', description: 'UUID of the section item' })
  @ApiResponse({ status: 204, description: 'Item deleted successfully' })
  removeItem(@Param('itemId', ParseUUIDPipe) itemId: string) {
    return this.service.removeItem(itemId);
  }
}
