# Notification System Documentation

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket Events](#websocket-events)
- [Installation & Setup](#installation--setup)
- [Usage Examples](#usage-examples)
- [Frontend Integration](#frontend-integration)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Notification System is a **hybrid real-time notification solution** that combines:
- **REST API** for all CRUD operations, filtering, and pagination
- **WebSocket (Socket.io)** for real-time notification delivery and live updates

This system allows users to receive instant notifications when events occur in the application, such as new messages, enrollment updates, reminders, and more.

---

## Features

### ✅ Core Features

- **Multiple Notification Types**: APPLICATIONS, MESSAGES, REMINDER, ARCHIVE
- **Real-time Delivery**: Instant notifications via WebSocket
- **Read/Unread Status**: Track notification read status
- **Archive System**: Archive notifications for later reference
- **Pagination**: Efficient pagination for large notification lists
- **Filtering**: Filter by type, read status, and archived status
- **Unread Count**: Get unread notification count in real-time
- **Metadata Support**: Store additional data (tags, action buttons, related entities)
- **Icon System**: Visual distinction with multiple icon types
- **JWT Authentication**: Secure REST API and WebSocket connections

### 🎯 Notification Types

- **APPLICATIONS**: Course enrollments, application status updates
- **MESSAGES**: Direct messages, replies, conversations
- **REMINDER**: Assignment reminders, course deadlines, system alerts
- **ARCHIVE**: Archived notifications (hidden from main view)

### 🎨 Icons

Available icons: `checkmark`, `message`, `reminder`, `warning`, `info`, `success`, `error`, `person`, `document`, `lock`, `wrench`, `star`, `settings`, `flag`, `bell`

---

## Architecture

### Components

```
NotificationModule
├── NotificationService      # Business logic & database operations
├── NotificationController    # REST API endpoints
├── NotificationGateway      # WebSocket real-time events
└── Notification Entity      # Database model
```

### Data Flow

1. **Notification Creation**:
   ```
   System/Admin → NotificationService.create()
   → Database Save
   → WebSocket Emit (if user connected)
   → Real-time Delivery
   ```

2. **User Actions**:
   ```
   User Action → REST API / WebSocket
   → NotificationService
   → Database Update
   → WebSocket Broadcast (if needed)
   ```

---

## Database Schema

### Notification Entity

```typescript
{
  id: string (UUID)
  title: string (max 255 chars)
  description: text
  type: enum (APPLICATIONS | MESSAGES | REMINDER | ARCHIVE)
  icon: enum (checkmark | message | reminder | ...)
  isRead: boolean (default: false)
  isArchived: boolean (default: false)
  metadata: jsonb (optional - tags, action buttons, etc.)
  userId: string (UUID) - Foreign key to User
  createdBy: string (UUID, optional)
  relatedEntityType: string (optional - e.g., "course", "enrollment")
  relatedEntityId: string (UUID, optional)
  created_at: timestamp
  updated_at: timestamp
  deleted_at: timestamp (soft delete)
}
```

### Indexes

- `userId + isRead` (for unread queries)
- `userId + type` (for type filtering)
- `userId + created_at` (for sorting)

---

## REST API Endpoints

### Base URL
```
/api/notifications
```

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### 1. Create Notification

**POST** `/api/notifications`

Create a new notification (Admin/System only).

**Request Body:**
```json
{
  "title": "New Message",
  "description": "You have a new message from Sarah Williams",
  "type": "MESSAGES",
  "icon": "message",
  "userId": "user-uuid",
  "metadata": {
    "tags": ["Course Inquiry"],
    "actionButton": "REPLY",
    "relatedEntityId": "course-uuid"
  },
  "relatedEntityType": "course",
  "relatedEntityId": "course-uuid"
}
```

**Response:** `201 Created`
```json
{
  "id": "notification-uuid",
  "title": "New Message",
  "description": "You have a new message from Sarah Williams",
  "type": "MESSAGES",
  "icon": "message",
  "isRead": false,
  "isArchived": false,
  "userId": "user-uuid",
  "created_at": "2025-12-29T10:00:00Z",
  ...
}
```

### 2. Get All Notifications

**GET** `/api/notifications`

Get paginated notifications for the current user.

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `type`: enum (APPLICATIONS | MESSAGES | REMINDER | ARCHIVE)
- `isRead`: boolean
- `isArchived`: boolean
- `search`: string (searches in title and description)

**Example:**
```
GET /api/notifications?page=1&limit=20&type=MESSAGES&isRead=false
```

**Response:** `200 OK`
```json
{
  "data": [...],
  "meta": {
    "itemsPerPage": 20,
    "totalItems": 50,
    "currentPage": 1,
    "totalPages": 3
  }
}
```

### 3. Get Notifications by Type

**GET** `/api/notifications/type/:type`

Get notifications filtered by type (for tab navigation).

**Path Parameters:**
- `type`: `ALL` | `APPLICATIONS` | `MESSAGES` | `REMINDER` | `ARCHIVE`

**Example:**
```
GET /api/notifications/type/MESSAGES?page=1&limit=20
```

**Response:** Same as Get All Notifications

### 4. Get Unread Count

**GET** `/api/notifications/unread/count`

Get unread notification count for the current user.

**Query Parameters:**
- `type`: enum (optional - filter by type)

**Example:**
```
GET /api/notifications/unread/count?type=MESSAGES
```

**Response:** `200 OK`
```json
{
  "count": 5
}
```

### 5. Get Single Notification

**GET** `/api/notifications/:id`

Get a single notification by ID.

**Response:** `200 OK`
```json
{
  "id": "notification-uuid",
  "title": "New Message",
  ...
}
```

### 6. Mark as Read

**PATCH** `/api/notifications/:id/read`

Mark a specific notification as read.

**Response:** `200 OK`
```json
{
  "id": "notification-uuid",
  "isRead": true,
  ...
}
```

### 7. Mark All as Read

**POST** `/api/notifications/mark-all-read`

Mark all notifications as read for the current user.

**Response:** `200 OK`
```json
{
  "count": 10
}
```

### 8. Archive Notification

**PATCH** `/api/notifications/:id/archive`

Archive a specific notification.

**Response:** `200 OK`
```json
{
  "id": "notification-uuid",
  "isArchived": true,
  ...
}
```

### 9. Update Notification

**PATCH** `/api/notifications/:id`

Update a notification (read/archived status).

**Request Body:**
```json
{
  "isRead": true,
  "isArchived": false
}
```

**Response:** `200 OK` (updated notification)

### 10. Delete Notification

**DELETE** `/api/notifications/:id`

Delete a notification permanently.

**Response:** `204 No Content`

### 11. Delete All Archived

**DELETE** `/api/notifications/archived/all`

Delete all archived notifications for the current user.

**Response:** `200 OK`
```json
{
  "count": 5
}
```

---

## WebSocket Events

### Connection

**URL:** `ws://localhost:3000/notifications` (or `wss://` for production)

**Authentication:** Pass JWT token via:
- `auth.token` in connection options
- `token` query parameter
- `Authorization: Bearer <token>` header

### Client → Server Events

#### `subscribe`
Subscribe to notification updates.

```javascript
socket.emit('subscribe');
```

**Response:**
```json
{ "status": "subscribed" }
```

#### `get_unread_count`
Get current unread count.

```javascript
socket.emit('get_unread_count');
```

**Response:**
```json
{ "count": 5 }
```

#### `mark_read`
Mark a notification as read.

```javascript
socket.emit('mark_read', { notificationId: 'uuid' });
```

**Response:**
```json
{
  "success": true,
  "notification": { ... }
}
```

#### `mark_all_read`
Mark all notifications as read.

```javascript
socket.emit('mark_all_read');
```

**Response:**
```json
{
  "success": true,
  "count": 10
}
```

### Server → Client Events

#### `new_notification`
Emitted when a new notification is created for the user.

```javascript
socket.on('new_notification', (notification) => {
  console.log('New notification:', notification);
  // Add to UI immediately
});
```

**Payload:**
```json
{
  "id": "uuid",
  "title": "New Message",
  "description": "You have a new message...",
  "type": "MESSAGES",
  "icon": "message",
  "isRead": false,
  "metadata": { ... },
  "created_at": "2025-12-29T10:00:00Z"
}
```

#### `unread_count`
Emitted when unread count changes.

```javascript
socket.on('unread_count', (data) => {
  console.log('Unread count:', data.count);
  // Update badge
});
```

**Payload:**
```json
{ "count": 5 }
```

#### `notification_updated`
Emitted when a notification is updated.

```javascript
socket.on('notification_updated', (notification) => {
  console.log('Updated:', notification);
  // Update in UI
});
```

**Payload:** Full notification object

---

## Installation & Setup

### Prerequisites

- NestJS application
- PostgreSQL database
- JWT authentication configured
- Socket.io client (for frontend)

### Backend Setup

The notification system is already integrated into the application. Ensure:

1. **Module is imported** in `app.module.ts`:
```typescript
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    // ... other modules
    NotificationModule,
  ],
})
```

2. **Entity is registered** in TypeORM:
```typescript
entities: [
  // ... other entities
  Notification,
]
```

3. **Dependencies installed**:
```bash
npm install @nestjs/websockets @nestjs/platform-socket.io socket.io
```

### Frontend Setup

Install Socket.io client:

```bash
npm install socket.io-client
# or
yarn add socket.io-client
```

---

## Usage Examples

### Backend: Creating Notifications

#### Single Notification

```typescript
import { NotificationService } from './notification/notification.service';
import { NotificationType } from './notification/entities/notification.entity';

// In your service
constructor(private notificationService: NotificationService) {}

async sendEnrollmentNotification(userId: string, courseName: string) {
  await this.notificationService.create({
    title: 'Enrollment Accepted',
    description: `Congratulations! Your enrollment in '${courseName}' has been accepted.`,
    type: NotificationType.APPLICATIONS,
    userId: userId,
    metadata: {
      tags: [courseName],
      actionButton: 'VIEW COURSE',
    },
    relatedEntityType: 'course',
    relatedEntityId: courseId,
  });
}
```

#### Multiple Users

```typescript
// Send to multiple users
const userIds = ['user1-uuid', 'user2-uuid', 'user3-uuid'];

await this.notificationService.createForUsers(userIds, {
  title: 'New Course Available',
  description: 'Check out our new course!',
  type: NotificationType.REMINDER,
  metadata: {
    tags: ['New Course'],
  },
});
```

### Frontend: React Example

```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function useNotifications(token: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!token) return;

    // Connect to WebSocket
    const newSocket = io('http://localhost:3000/notifications', {
      auth: { token },
      transports: ['websocket'],
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to notifications');
      newSocket.emit('subscribe');
    });

    // Listen for new notifications
    newSocket.on('new_notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      // Show toast notification
      showToast(notification);
    });

    // Listen for unread count
    newSocket.on('unread_count', (data) => {
      setUnreadCount(data.count);
    });

    // Listen for updates
    newSocket.on('notification_updated', (notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? notification : n))
      );
    });

    setSocket(newSocket);

    // Fetch initial notifications via REST API
    fetchNotifications();

    return () => {
      newSocket.close();
    };
  }, [token]);

  const fetchNotifications = async () => {
    const response = await fetch('/api/notifications?page=1&limit=20', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setNotifications(data.data);
  };

  const markAsRead = async (notificationId: string) => {
    // Via REST API
    await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    // Or via WebSocket
    socket?.emit('mark_read', { notificationId });
  };

  return {
    socket,
    notifications,
    unreadCount,
    markAsRead,
    fetchNotifications,
  };
}
```

### Frontend: Vue.js Example

```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';

export function useNotifications(token) {
  const socket = ref(null);
  const notifications = ref([]);
  const unreadCount = ref(0);

  onMounted(() => {
    if (!token) return;

    socket.value = io('http://localhost:3000/notifications', {
      auth: { token },
    });

    socket.value.on('connect', () => {
      socket.value.emit('subscribe');
    });

    socket.value.on('new_notification', (notification) => {
      notifications.value.unshift(notification);
    });

    socket.value.on('unread_count', (data) => {
      unreadCount.value = data.count;
    });
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.close();
    }
  });

  return {
    socket,
    notifications,
    unreadCount,
  };
}
```

---

## Frontend Integration

### Complete React Component Example

```typescript
import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './hooks/useAuth';

export function NotificationCenter() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    if (!token) return;

    // Connect WebSocket
    const socket = io('http://localhost:3000/notifications', {
      auth: { token },
    });

    socket.on('connect', () => {
      socket.emit('subscribe');
    });

    socket.on('new_notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('unread_count', (data) => {
      setUnreadCount(data.count);
    });

    // Fetch initial data
    fetchNotifications();

    return () => socket.close();
  }, [token, activeTab]);

  const fetchNotifications = async () => {
    const url = activeTab === 'ALL'
      ? '/api/notifications'
      : `/api/notifications/type/${activeTab}`;
    
    const response = await fetch(`${url}?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setNotifications(data.data);
  };

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const markAllAsRead = async () => {
    await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return (
    <div className="notification-center">
      <div className="header">
        <h2>Notifications</h2>
        <button onClick={markAllAsRead}>Mark All as Read</button>
        <span className="badge">{unreadCount}</span>
      </div>

      <div className="tabs">
        {['ALL', 'APPLICATIONS', 'MESSAGES', 'REMINDER', 'ARCHIVE'].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="notifications-list">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`notification ${notification.isRead ? 'read' : 'unread'}`}
            onClick={() => markAsRead(notification.id)}
          >
            <div className="icon">{notification.icon}</div>
            <div className="content">
              <h3>{notification.title}</h3>
              <p>{notification.description}</p>
              <span className="time">{formatTime(notification.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Testing

### Testing REST API

```bash
# Get notifications
curl -X GET http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create notification (Admin)
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "description": "This is a test",
    "type": "MESSAGES",
    "userId": "user-uuid"
  }'

# Mark as read
curl -X PATCH http://localhost:3000/api/notifications/NOTIFICATION_ID/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Testing WebSocket

Use Socket.io Client Tool or browser console:

```javascript
const socket = io('http://localhost:3000/notifications', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

socket.on('connect', () => {
  console.log('Connected');
  socket.emit('subscribe');
});

socket.on('new_notification', (notification) => {
  console.log('New notification:', notification);
});

socket.on('unread_count', (data) => {
  console.log('Unread count:', data.count);
});
```

---

## Troubleshooting

### WebSocket Connection Issues

**Problem:** Cannot connect to WebSocket

**Solutions:**
1. Check CORS settings in `notification.gateway.ts`
2. Verify JWT token is valid and not expired
3. Ensure WebSocket URL includes namespace: `/notifications`
4. Check server logs for connection errors

### Not Receiving Real-time Notifications

**Problem:** WebSocket connected but no notifications received

**Solutions:**
1. Verify `subscribe` event was emitted after connection
2. Check that notifications are created for the correct `userId`
3. Ensure `NotificationGateway` is properly injected in `NotificationService`
4. Check server logs for WebSocket emit errors

### Circular Dependency Error

**Problem:** `Nest can't resolve dependencies`

**Solution:** Already fixed with `forwardRef` in both `NotificationService` and `NotificationGateway`

### Database Errors

**Problem:** Notification entity not found

**Solutions:**
1. Ensure `Notification` entity is in TypeORM entities array
2. Run database migrations if using migrations
3. Check `synchronize: true` is enabled (development only)

---

## Best Practices

1. **Use REST API for:**
   - Initial data loading
   - Complex queries and filtering
   - Pagination
   - Bulk operations

2. **Use WebSocket for:**
   - Real-time notification delivery
   - Live unread count updates
   - Quick actions (mark as read)

3. **Notification Creation:**
   - Always include meaningful `title` and `description`
   - Use appropriate `type` for filtering
   - Add `metadata` for UI customization
   - Link to related entities when possible

4. **Performance:**
   - Use pagination for large notification lists
   - Archive old notifications regularly
   - Clean up archived notifications periodically

---

## API Response Examples

### Success Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "New Message",
  "description": "You have a new message from Sarah Williams",
  "type": "MESSAGES",
  "icon": "message",
  "isRead": false,
  "isArchived": false,
  "metadata": {
    "tags": ["Course Inquiry"],
    "actionButton": "REPLY"
  },
  "userId": "user-uuid",
  "created_at": "2025-12-29T10:00:00.000Z",
  "updated_at": "2025-12-29T10:00:00.000Z"
}
```

### Error Response
```json
{
  "statusCode": 404,
  "message": "Notification with ID xxx not found",
  "error": "Not Found"
}
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review server logs
3. Check WebSocket connection status
4. Verify JWT token validity

---

**Last Updated:** December 29, 2025

