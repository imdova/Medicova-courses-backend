# Notification Endpoints: REST API vs WebSocket (Real-time)

## 🔴 REST API Endpoints (HTTP)

All endpoints shown in Swagger are **REST API endpoints** (HTTP requests):

| Method | Endpoint | Description | Type |
|--------|----------|-------------|------|
| POST | `/api/notifications` | Create notification | REST API |
| GET | `/api/notifications` | Get all notifications | REST API |
| GET | `/api/notifications/type/{type}` | Get by type | REST API |
| GET | `/api/notifications/unread/count` | Get unread count | REST API |
| GET | `/api/notifications/{id}` | Get single notification | REST API |
| PATCH | `/api/notifications/{id}` | Update notification | REST API |
| DELETE | `/api/notifications/{id}` | Delete notification | REST API |
| PATCH | `/api/notifications/{id}/read` | Mark as read | REST API |
| POST | `/api/notifications/mark-all-read` | Mark all as read | REST API |
| PATCH | `/api/notifications/{id}/archive` | Archive notification | REST API |
| DELETE | `/api/notifications/archived/all` | Delete archived | REST API |

**These are NOT real-time** - they require HTTP requests.

---

## 🟢 WebSocket Events (Real-time)

WebSocket events are **NOT HTTP endpoints**. They use Socket.io and work through a WebSocket connection.

### Connection URL
```
ws://localhost:3000/notifications
```

### Client → Server Events (You send these)

| Event Name | Description | Real-time? |
|------------|-------------|------------|
| `subscribe` | Subscribe to notifications | ✅ Yes |
| `get_unread_count` | Get unread count | ✅ Yes |
| `mark_read` | Mark notification as read | ✅ Yes |
| `mark_all_read` | Mark all as read | ✅ Yes |

### Server → Client Events (You receive these automatically)

| Event Name | Description | Real-time? |
|------------|-------------|------------|
| `new_notification` | New notification created | ✅ **YES - Real-time push** |
| `unread_count` | Unread count updated | ✅ **YES - Real-time update** |
| `notification_updated` | Notification was updated | ✅ **YES - Real-time update** |

---

## 📊 Comparison

### REST API (HTTP)
- ❌ **Not real-time** - Requires manual HTTP requests
- ✅ Good for: Initial data loading, complex queries, pagination
- ✅ Works with: Standard HTTP clients, Postman, curl
- ✅ Appears in: Swagger documentation

### WebSocket (Socket.io)
- ✅ **Real-time** - Automatic push notifications
- ✅ Good for: Instant notifications, live updates, real-time count
- ✅ Works with: Socket.io client library
- ❌ Does NOT appear in: Swagger (it's not HTTP)

---

## 🎯 Real-time Features

### What happens in real-time via WebSocket:

1. **New Notification Created** → `new_notification` event fires automatically
2. **Unread Count Changes** → `unread_count` event fires automatically  
3. **Notification Updated** → `notification_updated` event fires automatically

### Example Flow:

```javascript
// 1. Connect to WebSocket
const socket = io('http://localhost:3000/notifications', {
  auth: { token: 'your-jwt-token' }
});

// 2. Listen for REAL-TIME events (automatic)
socket.on('new_notification', (notification) => {
  // This fires INSTANTLY when a new notification is created
  console.log('New notification received:', notification);
});

socket.on('unread_count', (data) => {
  // This fires INSTANTLY when count changes
  console.log('Unread count:', data.count);
});

// 3. Send actions via WebSocket (also real-time)
socket.emit('mark_read', { notificationId: 'uuid' });
// Response comes back immediately
```

---

## 🔄 Hybrid Approach

The system uses **BOTH**:

- **REST API**: For initial load, pagination, complex queries
- **WebSocket**: For real-time updates and instant notifications

### Typical Usage:

```javascript
// 1. Initial load via REST API
const response = await fetch('/api/notifications?page=1&limit=20');
const notifications = await response.json();

// 2. Connect WebSocket for real-time updates
const socket = io('http://localhost:3000/notifications', {
  auth: { token: 'your-jwt-token' }
});

// 3. Listen for new notifications in real-time
socket.on('new_notification', (notification) => {
  // Add to list immediately - no need to refresh!
  addNotificationToList(notification);
});
```

---

## 📝 Summary

**REST API Endpoints** (shown in Swagger):
- All 11 endpoints are REST API
- ❌ Not real-time
- ✅ Use for CRUD operations

**WebSocket Events** (NOT in Swagger):
- `new_notification` - ✅ **Real-time push**
- `unread_count` - ✅ **Real-time update**
- `notification_updated` - ✅ **Real-time update**
- `subscribe`, `get_unread_count`, `mark_read`, `mark_all_read` - Real-time actions

**Key Point**: WebSocket events are **real-time** and fire automatically. REST API requires manual HTTP requests.

