import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject, IsUUID, MaxLength } from 'class-validator';
import { NotificationType, NotificationIcon } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'Title of the notification',
    example: 'New Message',
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Description or body of the notification',
    example: 'You have a new message from Sarah Williams regarding your course inquiry.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.MESSAGES,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Icon to display',
    enum: NotificationIcon,
    example: NotificationIcon.MESSAGE,
    required: false,
  })
  @IsEnum(NotificationIcon)
  @IsOptional()
  icon?: NotificationIcon;

  @ApiProperty({
    description: 'Additional metadata (tags, action buttons, etc.)',
    example: { tags: ['Course Name'], actionButton: 'REPLY', relatedEntityId: 'uuid' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'ID of the user who will receive this notification',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Optional: ID of the user who created this notification',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @ApiProperty({
    description: 'Optional: Related entity type (e.g., "course", "enrollment", "message")',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  relatedEntityType?: string;

  @ApiProperty({
    description: 'Optional: ID of the related entity',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  relatedEntityId?: string;
}

