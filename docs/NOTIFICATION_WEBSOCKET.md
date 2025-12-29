# Notification System - WebSocket Integration

## Overview

The notification system uses a **hybrid approach**:
- **REST API** for all CRUD operations, fetching, filtering, and pagination
- **WebSocket (Socket.io)** for real-time notification delivery and live updates

## WebSocket Connection

### Connection URL

```
ws://localhost:3000/notifications
// or
wss://your-domain.com/notifications (for production)
```

### Authentication

WebSocket connections require JWT authentication. Pass the token in one of these ways:

1. **Via handshake auth:**
```javascript
const socket = io('http://localhost:3000/notifications', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

2. **Via query parameter:**
```javascript
const socket = io('http://localhost:3000/notifications?token=your-jwt-token');
```

3. **Via Authorization header:**
```javascript
const socket = io('http://localhost:3000/notifications', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

## WebSocket Events

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
Get current unread notification count.

```javascript
socket.emit('get_unread_count');
```

**Response:**
```json
{ "count": 5 }
```

#### `mark_read`
Mark a specific notification as read.

```javascript
socket.emit('mark_read', { notificationId: 'uuid-here' });
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
  // Update UI with new notification
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
  "created_at": "2025-12-29T10:00:00Z",
  ...
}
```

#### `unread_count`
Emitted when the unread count changes.

```javascript
socket.on('unread_count', (data) => {
  console.log('Unread count:', data.count);
  // Update badge count in UI
});
```

**Payload:**
```json
{ "count": 5 }
```

#### `notification_updated`
Emitted when a notification is updated (e.g., marked as read).

```javascript
socket.on('notification_updated', (notification) => {
  console.log('Notification updated:', notification);
  // Update notification in UI
});
```

## Frontend Integration Example

### React Example

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
    });

    // Listen for unread count updates
    newSocket.on('unread_count', (data) => {
      setUnreadCount(data.count);
    });

    // Listen for notification updates
    newSocket.on('notification_updated', (notification) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? notification : n))
      );
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, [token]);

  const markAsRead = (notificationId: string) => {
    socket?.emit('mark_read', { notificationId });
  };

  const markAllAsRead = () => {
    socket?.emit('mark_all_read');
  };

  return {
    socket,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
```

### Vue.js Example

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

## REST API + WebSocket Workflow

### Typical Flow:

1. **Initial Load (REST API):**
   ```javascript
   // Fetch initial notifications
   const response = await fetch('/api/notifications?page=1&limit=20', {
     headers: { Authorization: `Bearer ${token}` }
   });
   const data = await response.json();
   ```

2. **Connect WebSocket:**
   ```javascript
   const socket = io('http://localhost:3000/notifications', {
     auth: { token }
   });
   ```

3. **Real-time Updates:**
   - New notifications arrive via `new_notification` event
   - Unread count updates via `unread_count` event
   - Mark as read via WebSocket or REST API

4. **Actions:**
   - Use REST API for complex queries, filtering, pagination
   - Use WebSocket for real-time updates and quick actions

## Benefits of Hybrid Approach

✅ **REST API:**
- Reliable for all CRUD operations
- Easy to cache and paginate
- Works with HTTP/2 and CDNs
- Simple to test and debug

✅ **WebSocket:**
- Instant notification delivery
- Live unread count updates
- No polling needed
- Better user experience

## Testing WebSocket Connection

You can test the WebSocket connection using a tool like:
- [Socket.io Client Tool](https://amritb.github.io/socketio-client-tool/)
- [Postman](https://www.postman.com/) (supports WebSocket)
- Browser console with Socket.io client library

## Troubleshooting

### Connection Issues

1. **Check CORS settings** - Ensure your frontend origin is in the allowed list
2. **Verify JWT token** - Token must be valid and not expired
3. **Check WebSocket URL** - Use correct namespace `/notifications`

### Not Receiving Events

1. **Verify subscription** - Emit `subscribe` event after connection
2. **Check user ID** - Ensure notifications are created for the correct user
3. **Check server logs** - Look for WebSocket connection/disconnection logs

