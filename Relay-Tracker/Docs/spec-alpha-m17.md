# MISSION 17: Real-Time Notifications (WebSockets)

**Phase**: Alpha  
**Priority**: 🥇 Highest Impact  
**Dependencies**: None (Foundation for future real-time features)

---

## EXECUTIVE SUMMARY

Replace the current polling-based data fetching with a WebSocket-powered real-time notification system. Users will see issue updates, comments, and status changes instantly without manual page refresh.

---

## PROBLEM STATEMENT

### Current State

- Users must manually refresh the page or navigate away/back to see new data
- Multiple users working on the same issue don't see each other's comments until they refresh
- No visual indication when something has changed since the page loaded
- High API load from potential polling solutions

### User Pain Points

1. **SQA Team**: Misses urgent updates on issues they're investigating
2. **Reporters**: Doesn't know when their issue has been acknowledged or updated
3. **Managers**: Can't see real-time team activity without constant manual checking

---

## SOLUTION OVERVIEW

Implement a WebSocket server that broadcasts events to connected clients. The frontend will maintain a persistent connection and update the UI in real-time when relevant events occur.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Jira Webhook  │────▶│  Backend (Flask) │────▶│  WebSocket Hub  │
│   (Optional)    │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────────────────────┼─────────────────────────────────┐
                        │                                 │                                 │
                        ▼                                 ▼                                 ▼
                   ┌─────────┐                       ┌─────────┐                       ┌─────────┐
                   │ User A  │                       │ User B  │                       │ User C  │
                   │ Browser │                       │ Browser │                       │ Browser │
                   └─────────┘                       └─────────┘                       └─────────┘
```

---

## FUNCTIONAL REQUIREMENTS

### FR-1: WebSocket Connection Management

- **FR-1.1**: Clients establish a WebSocket connection upon successful login
- **FR-1.2**: Connections automatically reconnect on network interruption (exponential backoff)
- **FR-1.3**: Clients authenticate via a signed token in the connection handshake
- **FR-1.4**: Server maintains a registry of connected clients and their subscriptions

### FR-2: Event Types

The system must support the following event types:

| Event             | Trigger                          | Payload                                          | Recipients                         |
| :---------------- | :------------------------------- | :----------------------------------------------- | :--------------------------------- |
| `issue.created`   | New issue created via Relay      | `{ issueKey, summary, reporter, type }`          | All connected users                |
| `issue.updated`   | Status/Priority/Assignee changed | `{ issueKey, field, oldValue, newValue, actor }` | Users viewing the issue + watchers |
| `issue.commented` | New comment added                | `{ issueKey, commentId, author, preview }`       | Users viewing the issue + watchers |
| `connection.ping` | Keep-alive (every 30s)           | `{ timestamp }`                                  | Individual client                  |

### FR-3: UI Notifications

- **FR-3.1**: Toast notification appears for relevant events (configurable per user)
- **FR-3.2**: Unread badge appears on issue list when new issues arrive
- **FR-3.3**: Issue detail page updates in-place when new comments are added
- **FR-3.4**: Optional sound notification for high-priority events

### FR-4: Subscription Model

- **FR-4.1**: Global subscription: All `issue.created` events
- **FR-4.2**: Page-level subscription: Events for the specific issue being viewed
- **FR-4.3**: User preference subscription: Only issues assigned to or reported by the user

---

## TECHNICAL SPECIFICATIONS

### Backend (Python/Flask)

#### New Dependencies

```
flask-socketio==5.3.6
python-socketio==5.10.0
eventlet==0.34.2  # or gevent for async handling
```

#### New Files

| File                              | Purpose                                      |
| :-------------------------------- | :------------------------------------------- |
| `backend/api/websocket/hub.py`    | WebSocket event handlers and room management |
| `backend/api/websocket/events.py` | Event type definitions and payload schemas   |
| `backend/api/websocket/auth.py`   | Token verification for WebSocket handshake   |

#### Modified Files

| File                           | Changes                                         |
| :----------------------------- | :---------------------------------------------- |
| `backend/api/index.py`         | Initialize SocketIO with Flask app              |
| `backend/api/routes/issues.py` | Emit events after create/update/comment actions |

#### Room Strategy

```python
# Rooms for targeted broadcasting
"global"           # All connected users
"issue:{key}"      # Users viewing specific issue (e.g., "issue:FS-1234")
"user:{id}"        # Personal notifications for a specific user
```

### Frontend (React/TypeScript)

#### New Dependencies

```
socket.io-client@4.7.2
```

#### New Files

| File                                               | Purpose                                            |
| :------------------------------------------------- | :------------------------------------------------- |
| `frontend/src/lib/socket.ts`                       | Socket.IO client singleton with reconnection logic |
| `frontend/src/hooks/useSocket.ts`                  | React hook for subscribing to events               |
| `frontend/src/context/SocketContext.tsx`           | Provider for socket state across the app           |
| `frontend/src/components/ui/NotificationToast.tsx` | Real-time toast notification component             |

#### Modified Files

| File                                   | Changes                                                        |
| :------------------------------------- | :------------------------------------------------------------- |
| `frontend/src/App.tsx`                 | Wrap with `SocketProvider`                                     |
| `frontend/src/pages/IssueDetail.tsx`   | Subscribe to `issue:{key}` room, update comments in-place      |
| `frontend/src/pages/Issues.tsx`        | Subscribe to `global`, show "new issues" badge                 |
| `frontend/src/context/AuthContext.tsx` | Initialize socket connection after login, disconnect on logout |

---

## USER INTERFACE BEHAVIOR

### Notification Toast

```
┌────────────────────────────────────────────────┐
│ 🔔  New comment on FS-1234                     │
│     John Doe: "I've reproduced this on..."     │
│                                    [View] [×]  │
└────────────────────────────────────────────────┘
```

### Issue List Badge

```
┌────────────────────────────────────────────────┐
│  Issues                        🔵 3 new issues │
│ ─────────────────────────────────────────────  │
│  FS-1234  Login bug...                         │
│  FS-1235  Payment fails... (NEW)               │
│  FS-1236  Crash on iOS... (NEW)                │
└────────────────────────────────────────────────┘
```

### In-Place Comment Update

When a new comment arrives while viewing an issue:

1. Comment list smoothly animates to show the new comment
2. "New comment from [Name]" indicator appears briefly
3. No full page reload required

---

## CONFIGURATION

### Environment Variables

| Variable                           | Default | Description                        |
| :--------------------------------- | :------ | :--------------------------------- |
| `WEBSOCKET_ENABLED`                | `true`  | Feature flag to disable WebSockets |
| `WEBSOCKET_PING_INTERVAL`          | `30`    | Seconds between keep-alive pings   |
| `WEBSOCKET_RECONNECT_MAX_ATTEMPTS` | `10`    | Maximum reconnection attempts      |

### User Preferences (Database)

Add columns to `user_preferences` table:

```sql
ALTER TABLE user_preferences ADD COLUMN realtime_notifications INTEGER DEFAULT 1;
ALTER TABLE user_preferences ADD COLUMN notification_sound INTEGER DEFAULT 0;
```

---

## TESTING CHECKLIST

- [ ] WebSocket connection establishes after login
- [ ] Connection automatically reconnects after network interruption
- [ ] `issue.created` event broadcasts to all connected users
- [ ] `issue.commented` event only reaches users on that issue's page
- [ ] Toast notifications appear and are dismissible
- [ ] "New issues" badge appears and clears when clicked
- [ ] Comments update in-place without page reload
- [ ] Logout properly disconnects the WebSocket
- [ ] Feature works correctly with multiple browser tabs open

---

## SECURITY CONSIDERATIONS

1. **Authentication**: WebSocket handshake must verify the user's JWT token
2. **Authorization**: Users can only join rooms they have access to
3. **Rate Limiting**: Prevent malicious clients from flooding the event bus
4. **Data Sanitization**: All event payloads must be sanitized before broadcast

---

## ROLLBACK PLAN

If issues arise in production:

1. Set `WEBSOCKET_ENABLED=false` environment variable
2. Frontend falls back to manual refresh behavior
3. No data loss or corruption possible (WebSocket is read-only)

---

## SUCCESS METRICS

| Metric                                      | Target         |
| :------------------------------------------ | :------------- |
| Connection success rate                     | > 99%          |
| Average event latency                       | < 500ms        |
| User engagement (issues viewed per session) | +20% increase  |
| Support tickets about "stale data"          | -80% reduction |

---

## OUT OF SCOPE FOR THIS MISSION

- Jira Webhook integration (external dependency, separate mission)
- Push notifications for mobile/browser (requires service worker)
- Presence indicators ("X is viewing this issue")
