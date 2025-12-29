import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType, NotificationIcon } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { FilterNotificationDto } from './dto/filter-notification.dto';
import { PaginateQuery, Paginated, paginate } from 'nestjs-paginate';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @Inject(forwardRef(() => NotificationGateway))
    private readonly notificationGateway?: NotificationGateway,
  ) {}

  /**
   * Create a new notification
   */
  async create(createDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      ...createDto,
      icon: createDto.icon || this.getDefaultIconForType(createDto.type),
    });

    const savedNotification = await this.notificationRepo.save(notification);

    // Emit WebSocket event for real-time notification
    if (this.notificationGateway) {
      await this.notificationGateway.emitNewNotification(
        createDto.userId,
        savedNotification,
      );
    }

    return savedNotification;
  }

  /**
   * Create multiple notifications for multiple users
   */
  async createForUsers(
    userIds: string[],
    createDto: Omit<CreateNotificationDto, 'userId'>,
  ): Promise<Notification[]> {
    const notifications = userIds.map((userId) =>
      this.notificationRepo.create({
        ...createDto,
        userId,
        icon: createDto.icon || this.getDefaultIconForType(createDto.type),
      }),
    );

    const savedNotifications = await this.notificationRepo.save(notifications);

    // Emit WebSocket events for real-time notifications
    if (this.notificationGateway) {
      for (const notification of savedNotifications) {
        await this.notificationGateway.emitNewNotification(
          notification.userId,
          notification,
        );
      }
    }

    return savedNotifications;
  }

  /**
   * Get all notifications for a user with filtering and pagination
   */
  async findAll(
    userId: string,
    query: PaginateQuery,
    filters?: FilterNotificationDto,
  ): Promise<Paginated<Notification>> {
    const queryBuilder = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.created_at', 'DESC');

    // Apply filters
    if (filters?.type) {
      queryBuilder.andWhere('notification.type = :type', { type: filters.type });
    }

    if (filters?.isRead !== undefined) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: filters.isRead });
    }

    if (filters?.isArchived !== undefined) {
      queryBuilder.andWhere('notification.isArchived = :isArchived', {
        isArchived: filters.isArchived,
      });
    } else {
      // By default, exclude archived notifications unless explicitly requested
      queryBuilder.andWhere('notification.isArchived = :isArchived', { isArchived: false });
    }

    return paginate(query, queryBuilder, {
      sortableColumns: ['created_at', 'isRead'],
      defaultSortBy: [['created_at', 'DESC']],
      searchableColumns: ['title', 'description'],
      relations: ['user'],
    });
  }

  /**
   * Get notifications by type (for the tabs: ALL, APPLICATIONS, MESSAGES, REMINDER, ARCHIVE)
   */
  async findByType(
    userId: string,
    type: NotificationType | 'ALL',
    query: PaginateQuery,
  ): Promise<Paginated<Notification>> {
    const queryBuilder = this.notificationRepo
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .orderBy('notification.created_at', 'DESC');

    if (type === 'ARCHIVE') {
      queryBuilder.andWhere('notification.isArchived = :isArchived', { isArchived: true });
    } else if (type !== 'ALL') {
      queryBuilder.andWhere('notification.type = :type', { type });
      queryBuilder.andWhere('notification.isArchived = :isArchived', { isArchived: false });
    } else {
      // ALL - show all non-archived
      queryBuilder.andWhere('notification.isArchived = :isArchived', { isArchived: false });
    }

    return paginate(query, queryBuilder, {
      sortableColumns: ['created_at', 'isRead'],
      defaultSortBy: [['created_at', 'DESC']],
      searchableColumns: ['title', 'description'],
      relations: ['user'],
    });
  }

  /**
   * Get a single notification by ID
   */
  async findOne(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
      relations: ['user'],
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }

    return notification;
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepo.count({
      where: {
        userId,
        isRead: false,
        isArchived: false,
      },
    });
  }

  /**
   * Get unread count by type
   */
  async getUnreadCountByType(userId: string, type?: NotificationType): Promise<number> {
    const where: any = {
      userId,
      isRead: false,
      isArchived: false,
    };

    if (type) {
      where.type = type;
    }

    return await this.notificationRepo.count({ where });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.findOne(notificationId, userId);

    notification.isRead = true;
    const updatedNotification = await this.notificationRepo.save(notification);

    // Emit WebSocket event for real-time update
    if (this.notificationGateway) {
      await this.notificationGateway.emitNotificationUpdate(
        userId,
        updatedNotification,
      );
      await this.notificationGateway.emitUnreadCount(userId);
    }

    return updatedNotification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepo.update(
      {
        userId,
        isRead: false,
        isArchived: false,
      },
      {
        isRead: true,
      },
    );

    // Emit WebSocket event for real-time update
    if (this.notificationGateway) {
      await this.notificationGateway.emitUnreadCount(userId);
    }

    return { count: result.affected || 0 };
  }

  /**
   * Archive a notification
   */
  async archive(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.findOne(notificationId, userId);

    notification.isArchived = true;
    return await this.notificationRepo.save(notification);
  }

  /**
   * Archive all notifications for a user
   */
  async archiveAll(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepo.update(
      {
        userId,
        isArchived: false,
      },
      {
        isArchived: true,
      },
    );

    return { count: result.affected || 0 };
  }

  /**
   * Update a notification
   */
  async update(
    notificationId: string,
    userId: string,
    updateDto: UpdateNotificationDto,
  ): Promise<Notification> {
    const notification = await this.findOne(notificationId, userId);

    Object.assign(notification, updateDto);
    return await this.notificationRepo.save(notification);
  }

  /**
   * Delete a notification
   */
  async remove(notificationId: string, userId: string): Promise<void> {
    const notification = await this.findOne(notificationId, userId);
    await this.notificationRepo.remove(notification);
  }

  /**
   * Delete all archived notifications for a user
   */
  async deleteArchived(userId: string): Promise<{ count: number }> {
    const result = await this.notificationRepo.delete({
      userId,
      isArchived: true,
    });

    return { count: result.affected || 0 };
  }

  /**
   * Get default icon for notification type
   */
  private getDefaultIconForType(type: NotificationType): NotificationIcon {
    const iconMap: Record<NotificationType, NotificationIcon> = {
      [NotificationType.APPLICATIONS]: NotificationIcon.CHECKMARK,
      [NotificationType.MESSAGES]: NotificationIcon.MESSAGE,
      [NotificationType.REMINDER]: NotificationIcon.REMINDER,
      [NotificationType.ARCHIVE]: NotificationIcon.DOCUMENT,
    };

    return iconMap[type] || NotificationIcon.INFO;
  }
}

