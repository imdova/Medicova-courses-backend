import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BasicEntity } from 'src/common/entities/basic.entity';
import { User } from 'src/user/entities/user.entity';

export enum NotificationType {
  APPLICATIONS = 'APPLICATIONS',
  MESSAGES = 'MESSAGES',
  REMINDER = 'REMINDER',
  ARCHIVE = 'ARCHIVE',
}

export enum NotificationIcon {
  CHECKMARK = 'checkmark',
  MESSAGE = 'message',
  REMINDER = 'reminder',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success',
  ERROR = 'error',
  PERSON = 'person',
  DOCUMENT = 'document',
  LOCK = 'lock',
  WRENCH = 'wrench',
  STAR = 'star',
  SETTINGS = 'settings',
  FLAG = 'flag',
  BELL = 'bell',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'type'])
@Index(['userId', 'created_at'])
export class Notification extends BasicEntity {
  @ApiProperty({
    description: 'Title of the notification',
    example: 'New Message',
  })
  @Column({ length: 255 })
  title: string;

  @ApiProperty({
    description: 'Description or body of the notification',
    example:
      'You have a new message from Sarah Williams regarding your course inquiry.',
  })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({
    description: 'Type of notification for filtering',
    enum: NotificationType,
    example: NotificationType.MESSAGES,
  })
  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.MESSAGES,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Icon to display for the notification',
    enum: NotificationIcon,
    example: NotificationIcon.MESSAGE,
  })
  @Column({
    type: 'enum',
    enum: NotificationIcon,
    default: NotificationIcon.INFO,
  })
  icon: NotificationIcon;

  @ApiProperty({
    description: 'Whether the notification has been read',
    default: false,
  })
  @Column({ default: false, name: 'is_read' })
  @Index()
  isRead: boolean;

  @ApiProperty({
    description: 'Whether the notification is archived',
    default: false,
  })
  @Column({ default: false, name: 'is_archived' })
  @Index()
  isArchived: boolean;

  @ApiProperty({
    description:
      'Additional metadata as JSON (e.g., tags, action buttons, related entity IDs)',
    nullable: true,
    example: {
      tags: ['Course Name'],
      actionButton: 'REPLY',
      relatedEntityId: 'uuid',
    },
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'The user who will receive this notification',
    type: () => User,
  })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    description: 'ID of the user who will receive this notification',
  })
  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ApiProperty({
    description: 'Optional: ID of the user who created/sent this notification',
    nullable: true,
  })
  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'created_by' })
  createdBy?: string;

  @ApiProperty({
    description:
      'Optional: Related entity type (e.g., "course", "enrollment", "message")',
    nullable: true,
  })
  @Column({ length: 100, nullable: true, name: 'related_entity_type' })
  relatedEntityType?: string;

  @ApiProperty({
    description: 'Optional: ID of the related entity',
    nullable: true,
  })
  @Column({ type: 'uuid', nullable: true, name: 'related_entity_id' })
  relatedEntityId?: string;
}
