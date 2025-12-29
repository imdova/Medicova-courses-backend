import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { Notification, NotificationType } from './entities/notification.entity';
import { Paginate, Paginated, PaginateQuery } from 'nestjs-paginate';

@ApiTags('Notifications')
@ApiBearerAuth('access_token')
@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Create a new notification (Admin/System only)
   */
  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, type: Notification })
  create(@Body() createDto: CreateNotificationDto) {
    return this.notificationService.create(createDto);
  }

  /**
   * Get all notifications for the current user with filtering
   */
  @Get()
  @ApiOperation({
    summary: 'Get all notifications for the current user',
    description: 'Returns paginated notifications with optional filtering',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'isArchived', required: false, type: Boolean })
  @ApiResponse({ status: 200 })
  findAll(
    @Req() req,
    @Paginate() query: PaginateQuery,
    @Query() filters?: FilterNotificationDto,
  ): Promise<Paginated<Notification>> {
    const userId = req.user.sub;
    return this.notificationService.findAll(userId, query, filters);
  }

  /**
   * Get notifications by type (for tabs: ALL, APPLICATIONS, MESSAGES, REMINDER, ARCHIVE)
   */
  @Get('type/:type')
  @ApiOperation({
    summary: 'Get notifications by type',
    description: 'Get notifications filtered by type (ALL, APPLICATIONS, MESSAGES, REMINDER, ARCHIVE)',
  })
  @ApiParam({
    name: 'type',
    enum: ['ALL', ...Object.values(NotificationType)],
    description: 'Notification type or ALL',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200 })
  findByType(
    @Req() req,
    @Param('type') type: NotificationType | 'ALL',
    @Paginate() query: PaginateQuery,
  ): Promise<Paginated<Notification>> {
    const userId = req.user.sub;
    return this.notificationService.findByType(userId, type, query);
  }

  /**
   * Get unread notification count
   */
  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiResponse({ status: 200, schema: { type: 'object', properties: { count: { type: 'number' } } } })
  async getUnreadCount(@Req() req, @Query('type') type?: NotificationType) {
    const userId = req.user.sub;
    const count = await this.notificationService.getUnreadCountByType(userId, type);
    return { count };
  }

  /**
   * Get a single notification by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single notification by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Notification ID' })
  @ApiResponse({ status: 200, type: Notification })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  findOne(@Req() req, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.notificationService.findOne(id, userId);
  }

  /**
   * Mark a notification as read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', type: String, description: 'Notification ID' })
  @ApiResponse({ status: 200, type: Notification })
  markAsRead(@Req() req, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.notificationService.markAsRead(id, userId);
  }

  /**
   * Mark all notifications as read
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for the current user' })
  @ApiResponse({
    status: 200,
    schema: { type: 'object', properties: { count: { type: 'number' } } },
  })
  markAllAsRead(@Req() req) {
    const userId = req.user.sub;
    return this.notificationService.markAllAsRead(userId);
  }

  /**
   * Archive a notification
   */
  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a notification' })
  @ApiParam({ name: 'id', type: String, description: 'Notification ID' })
  @ApiResponse({ status: 200, type: Notification })
  archive(@Req() req, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.notificationService.archive(id, userId);
  }

  /**
   * Update a notification
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a notification' })
  @ApiParam({ name: 'id', type: String, description: 'Notification ID' })
  @ApiResponse({ status: 200, type: Notification })
  update(@Req() req, @Param('id') id: string, @Body() updateDto: UpdateNotificationDto) {
    const userId = req.user.sub;
    return this.notificationService.update(id, userId, updateDto);
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', type: String, description: 'Notification ID' })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  remove(@Req() req, @Param('id') id: string) {
    const userId = req.user.sub;
    return this.notificationService.remove(id, userId);
  }

  /**
   * Delete all archived notifications
   */
  @Delete('archived/all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all archived notifications for the current user' })
  @ApiResponse({
    status: 200,
    schema: { type: 'object', properties: { count: { type: 'number' } } },
  })
  deleteArchived(@Req() req) {
    const userId = req.user.sub;
    return this.notificationService.deleteArchived(userId);
  }
}

