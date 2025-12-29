import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationService } from './notification.service';
import { Notification } from './entities/notification.entity';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      'https://courses.medicova.net',
      'https://jobacademy.net',
    ],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Handle WebSocket connection
   * Authenticate user via JWT token
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Get token from handshake auth or query
      const token =
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });

      // Attach user info to socket
      client.userId = payload.sub;
      client.user = payload;

      // Store connection
      this.connectedUsers.set(payload.sub, client.id);

      this.logger.log(`User ${payload.sub} connected (socket: ${client.id})`);

      // Send initial unread count
      const unreadCount = await this.notificationService.getUnreadCount(
        payload.sub,
      );
      client.emit('unread_count', { count: unreadCount });

      // Join user-specific room
      client.join(`user:${payload.sub}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      this.connectedUsers.delete(client.userId);
      this.logger.log(`User ${client.userId} disconnected`);
    }
  }

  /**
   * Subscribe to notification updates
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    this.logger.log(`User ${client.userId} subscribed to notifications`);
    return { status: 'subscribed' };
  }

  /**
   * Get unread count via WebSocket
   */
  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    const count = await this.notificationService.getUnreadCount(client.userId);
    return { count };
  }

  /**
   * Mark notification as read via WebSocket
   */
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const notification = await this.notificationService.markAsRead(
        data.notificationId,
        client.userId,
      );

      // Emit updated unread count
      const unreadCount = await this.notificationService.getUnreadCount(
        client.userId,
      );
      client.emit('unread_count', { count: unreadCount });

      return { success: true, notification };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Mark all notifications as read via WebSocket
   */
  @SubscribeMessage('mark_all_read')
  async handleMarkAllRead(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const result = await this.notificationService.markAllAsRead(
        client.userId,
      );

      // Emit updated unread count
      client.emit('unread_count', { count: 0 });

      return { success: true, ...result };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Emit new notification to specific user
   */
  async emitNewNotification(userId: string, notification: Notification) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.server.to(`user:${userId}`).emit('new_notification', notification);

      // Update unread count
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      this.server.to(`user:${userId}`).emit('unread_count', { count: unreadCount });

      this.logger.log(`Sent new notification to user ${userId}`);
    }
  }

  /**
   * Emit updated unread count to specific user
   */
  async emitUnreadCount(userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('unread_count', { count });
  }

  /**
   * Emit notification update (e.g., marked as read)
   */
  async emitNotificationUpdate(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification_updated', notification);
  }

  /**
   * Get number of connected users
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }
}

