# InsightPulse API Documentation

Base URL: `/api`

## Authentication

All endpoints (except health check) require a Bearer Token from Supabase Auth.

**Header:** `Authorization: Bearer <token>`

### Authentication Flow
1. User logs in via Supabase Auth in the frontend
2. JWT token is stored in the client and included in all API requests
3. Backend validates the token with Supabase
4. First-time users are auto-created (first user becomes admin, others become viewers)
5. Returns `401 Unauthorized` if token is missing or invalid
6. Returns `403 Forbidden` if user account is disabled or deleted

### Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **Admin** | Full CRUD on all resources, user management, trigger imports/analysis |
| **Facilitator** | Create/edit sessions and action items |
| **Viewer** | Read-only access to sessions, analyses, and dashboard |

---

## Health Check

### Check API Health
```
GET /health
```
No authentication required.

**Response:**
```json
{
  "status": "healthy"
}
```

---

## Sessions

### List All Sessions
```
GET /sessions
```

Returns all sessions ordered by date (newest first).

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "session_id": "GBLr335E",
    "session_name": "Training Session Name",
    "session_date": "2024-01-15",
    "facilitator_name": "John Doe",
    "num_responses": 25,
    "status": "analyzed",
    "created_at": "2024-01-15T10:30:00Z",
    "created_by": "uuid",
    "analyzed_at": "2024-01-15T11:00:00Z",
    "ratings": { ... },
    "common_issues": [ ... ]
  }
]
```

### Get Session Details
```
GET /sessions/:id
```

Returns full details for a specific session.

**Path Parameters:**
- `id` (UUID) - Session ID

**Response:** `200 OK` - Single session object (same schema as list)

**Errors:**
- `404 Not Found` - Session does not exist

### Update Session
```
PATCH /sessions/:id
```
**Authorization:** Admin only

**Path Parameters:**
- `id` (UUID) - Session ID

**Request Body:**
```json
{
  "session_name": "Updated Session Name"
}
```

**Response:** `200 OK` - Updated session object

**Errors:**
- `403 Forbidden` - Not an admin
- `404 Not Found` - Session does not exist

### Import from Google Sheets
```
POST /sessions/import
```
**Authorization:** Admin only

Triggers synchronization with the linked Google Sheet. Fetches survey responses and creates/updates sessions.

**Request Body:** `{}`

**Response:** `200 OK`
```json
{
  "message": "Import completed successfully",
  "imported_new": 5
}
```

**Notes:**
- Reads from spreadsheet ID configured in `GOOGLE_SHEETS_SPREADSHEET_ID` environment variable
- Expects 18-column survey format (timestamp, email, session_date, session_id, facilitator_name, 4 open-ended questions, 9 rating questions, comments)
- Creates new sessions or updates existing ones by session_id
- Automatically calculates and stores rating averages

**Errors:**
- `403 Forbidden` - Not an admin
- `500 Internal Server Error` - Spreadsheet ID not configured or API error

### Run AI Analysis
```
POST /sessions/:id/analyze
```
**Authorization:** Admin only

Triggers GPT-4o analysis for the session.

**Path Parameters:**
- `id` (UUID) - Session ID

**Request Body:** `{}`

**Response:** `200 OK`
```json
{
  "message": "Analysis complete"
}
```

**Notes:**
- Two-step AI analysis process:
  1. Analyzes 4 open-ended questions individually
  2. Generates common issues table from all analyses
- Clears existing analyses before running
- Updates session status to "analyzed"
- Sets `analyzed_at` timestamp

**Errors:**
- `400 Bad Request` - Analysis failed
- `403 Forbidden` - Not an admin
- `404 Not Found` - Session does not exist
- `500 Internal Server Error` - OpenAI API error

### Delete Session
```
DELETE /sessions/:id
```
**Authorization:** Admin only

Soft-deletes a session (sets `deleted_at` timestamp).

**Path Parameters:**
- `id` (UUID) - Session ID

**Response:** `200 OK`
```json
{
  "message": "Session deleted successfully"
}
```

**Errors:**
- `403 Forbidden` - Not an admin
- `404 Not Found` - Session does not exist

---

## Analyses

### Get Question Analyses
```
GET /sessions/:id/analyses
```

Returns the AI analysis for each open-ended question.

**Path Parameters:**
- `id` (UUID) - Session ID

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "session_id": "uuid",
    "question_label": "learned",
    "question_text": "What did you learn in this session?",
    "analysis_text": "The participants reported learning about...",
    "created_at": "2024-01-15T11:00:00Z"
  }
]
```

**Question Labels:**
- `learned` - "What did you learn in this session?"
- `apply` - "How can you apply what you learned?"
- `need_to_learn` - "What more do you need to learn or practice?"
- `comments` - "Additional comments or suggestions?"

### Get Common Issues
```
GET /sessions/:id/common-issues
```

Returns the table of common issues and evidence extracted from analyses.

**Path Parameters:**
- `id` (UUID) - Session ID

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "session_id": "uuid",
    "common_issue": "Need for more hands-on practice",
    "evidence_signal": "Multiple participants mentioned wanting more practical exercises",
    "display_order": 1,
    "created_at": "2024-01-15T11:00:00Z"
  }
]
```

### Get Session Ratings
```
GET /sessions/:id/ratings
```

Returns the averaged numerical ratings for the session.

**Path Parameters:**
- `id` (UUID) - Session ID

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "session_id": "uuid",
  "facilitator_understanding": 4.5,
  "learning_mechanics": 4.2,
  "qa_support": 4.8,
  "problem_articulation": 4.3,
  "session_pace": 4.0,
  "tools_helpfulness": 4.1,
  "repeatability": 4.6,
  "learning_objectives": 4.4,
  "overall_quality": 4.5,
  "created_at": "2024-01-15T10:30:00Z"
}
```

Returns empty object `{}` if no ratings exist.

---

## Action Items

### List Action Items
```
GET /action-items
```

**Query Parameters:**
- `session_id` (optional) - Filter by session UUID
- `status` (optional) - Filter by status: `Open`, `In Progress`, `Completed`, `On Hold`
- `priority` (optional) - Filter by priority: `High`, `Medium`, `Low`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "session_id": "uuid",
    "issue": "Participants need more practice time",
    "action": "Add 30-minute hands-on exercise",
    "priority": "High",
    "person_in_charge": "Jane Smith",
    "deadline": "2024-02-01",
    "status": "Open",
    "notes": "Discuss with training team",
    "created_at": "2024-01-15T12:00:00Z",
    "created_by": "uuid",
    "updated_at": "2024-01-15T12:00:00Z",
    "updated_by": "uuid",
    "session_name": "Training Session Name",
    "session_short_id": "GBLr335E"
  }
]
```

### Create Action Item
```
POST /action-items
```
**Authorization:** Facilitator or Admin

**Request Body:**
```json
{
  "session_id": "uuid",
  "issue": "string (required)",
  "action": "string (required)",
  "priority": "High|Medium|Low (required)",
  "person_in_charge": "string (optional)",
  "deadline": "YYYY-MM-DD (optional)",
  "status": "Open|In Progress|Completed|On Hold (optional, defaults to 'Open')",
  "notes": "string (optional)"
}
```

**Response:** `201 Created` - Created action item object

**Errors:**
- `400 Bad Request` - Missing required fields or invalid data
- `403 Forbidden` - Not a facilitator or admin

### Update Action Item
```
PUT /action-items/:id
```
**Authorization:** Facilitator or Admin

**Path Parameters:**
- `id` (UUID) - Action item ID

**Request Body:** (all fields optional)
```json
{
  "issue": "string",
  "action": "string",
  "priority": "High|Medium|Low",
  "person_in_charge": "string",
  "deadline": "YYYY-MM-DD",
  "status": "Open|In Progress|Completed|On Hold",
  "notes": "string"
}
```

**Response:** `200 OK` - Updated action item object

**Errors:**
- `403 Forbidden` - Not a facilitator or admin
- `404 Not Found` - Action item does not exist

### Delete Action Item
```
DELETE /action-items/:id
```
**Authorization:** Facilitator or Admin

**Path Parameters:**
- `id` (UUID) - Action item ID

**Response:** `200 OK`
```json
{
  "message": "Deleted successfully"
}
```

**Errors:**
- `403 Forbidden` - Not a facilitator or admin
- `404 Not Found` - Action item does not exist

---

## Users

### List Users
```
GET /users
```
**Authorization:** Admin only

Returns all users (excluding soft-deleted).

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "profile_picture_url": "https://...",
    "role": "facilitator",
    "last_login_at": "2024-01-15T09:00:00Z",
    "is_active": true,
    "deleted_at": null,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T09:00:00Z"
  }
]
```

### Get Current User Profile
```
GET /users/me
```

Returns the authenticated user's profile.

**Response:** `200 OK` - User object (same schema as list)

### Update User Role
```
PUT /users/:id/role
```
**Authorization:** Admin only

**Path Parameters:**
- `id` (UUID) - User ID

**Request Body:**
```json
{
  "role": "admin|facilitator|viewer"
}
```

**Response:** `200 OK` - Updated user object

**Errors:**
- `400 Bad Request` - Invalid role value
- `403 Forbidden` - Not an admin
- `404 Not Found` - User does not exist

### Update User Access
```
PUT /users/:id/access
```
**Authorization:** Admin only

Enable or disable a user's access.

**Path Parameters:**
- `id` (UUID) - User ID

**Request Body:**
```json
{
  "is_active": true|false
}
```

**Response:** `200 OK` - Updated user object

**Notes:**
- Admin cannot disable their own account

**Errors:**
- `400 Bad Request` - Missing field or attempting to disable self
- `403 Forbidden` - Not an admin
- `404 Not Found` - User does not exist

### Delete User
```
DELETE /users/:id
```
**Authorization:** Admin only

Soft-deletes a user (sets `deleted_at` timestamp).

**Path Parameters:**
- `id` (UUID) - User ID

**Response:** `200 OK`
```json
{
  "message": "User deleted successfully"
}
```

**Notes:**
- Admin cannot delete their own account

**Errors:**
- `400 Bad Request` - Attempting to delete self
- `403 Forbidden` - Not an admin
- `404 Not Found` - User does not exist

### Bulk Create Users
```
POST /users/bulk
```
**Authorization:** Admin only

Create multiple users at once.

**Request Body:**
```json
{
  "emails": ["user1@example.com", "user2@example.com"],
  "role": "viewer|facilitator|admin (optional, defaults to 'viewer')"
}
```

**Response:** `200 OK`
```json
{
  "created": [ ... user objects ... ],
  "skipped": [
    { "email": "existing@example.com", "reason": "User already exists" }
  ],
  "errors": [
    { "email": "invalid-email", "reason": "Invalid email format" }
  ],
  "summary": {
    "created_count": 2,
    "skipped_count": 1,
    "error_count": 1
  }
}
```

**Notes:**
- Validates email format before creating
- Skips users that already exist
- Auto-restores soft-deleted users if re-added

**Errors:**
- `400 Bad Request` - Missing emails array
- `403 Forbidden` - Not an admin

---

## Dashboard

### Get Dashboard Statistics
```
GET /dashboard/stats
```
or
```
GET /dashboard/statistics
```

Returns aggregate statistics and recent activity.

**Response:** `200 OK`
```json
{
  "total_sessions": 42,
  "open_action_items": 15,
  "in_progress_action_items": 8,
  "average_repeatability": 4.35,
  "recent_sessions": [
    {
      "id": "uuid",
      "session_id": "GBLr335E",
      "session_name": "Training Session",
      "session_date": "2024-01-15",
      "facilitator_name": "John Doe",
      "num_responses": 25,
      "status": "analyzed",
      "created_at": "2024-01-15T10:30:00Z",
      "analyzed_at": "2024-01-15T11:00:00Z",
      "ratings": { ... },
      "common_issues": [ ... ]
    }
  ]
}
```

**Notes:**
- `recent_sessions` returns the 5 most recent sessions by date
- `average_repeatability` is calculated from all SessionRating records (returns 0.0 if no data)

### Get Facilitator Performance Metrics
```
GET /dashboard/performance
```

Returns aggregated performance metrics grouped by facilitator.

**Response:** `200 OK`
```json
[
  {
    "facilitator_name": "John Doe",
    "avg_understanding": 4.5,
    "avg_qa": 4.3,
    "avg_articulation": 4.2,
    "avg_overall": 4.4,
    "session_count": 12,
    "total_responses": 156
  }
]
```

### Get Facilitator Session History
```
GET /dashboard/facilitator-history?name=John Doe
```

Returns detailed session history for a specific facilitator.

**Query Parameters:**
- `name` (required) - Facilitator name to search for

**Response:** `200 OK`
```json
[
  {
    "session_id": "GBLr335E",
    "session_name": "Training Session",
    "date": "2024-01-15",
    "num_responses": 25,
    "facilitator_understanding": 4.5,
    "learning_mechanics": 4.2,
    "qa_support": 4.8,
    "problem_articulation": 4.3,
    "session_pace": 4.0,
    "tools_helpfulness": 4.1,
    "repeatability": 4.6,
    "learning_objectives": 4.4,
    "overall_quality": 4.5
  }
]
```

**Notes:**
- Results ordered by session date (chronological)
- Includes all 9 rating metrics

**Errors:**
- `400 Bad Request` - Missing or empty `name` parameter

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request - Invalid input or missing required fields |
| `401` | Unauthorized - Missing or invalid auth token |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource does not exist |
| `500` | Internal Server Error - Server-side error |

---

## Data Types Reference

### Session Status
- `pending` - Imported but not analyzed
- `analyzed` - AI analysis complete

### Action Item Status
- `Open` - New, not started
- `In Progress` - Being worked on
- `Completed` - Done
- `On Hold` - Paused

### Action Item Priority
- `High`
- `Medium`
- `Low`

### User Roles
- `admin` - Full access
- `facilitator` - Can manage sessions and action items
- `viewer` - Read-only access

### Rating Metrics (Scale 1-5)
1. `facilitator_understanding` - Facilitator's understanding of the topic
2. `learning_mechanics` - Learning mechanics and activities
3. `qa_support` - Q&A and support quality
4. `problem_articulation` - Problem articulation clarity
5. `session_pace` - Session pace appropriateness
6. `tools_helpfulness` - Tools and materials helpfulness
7. `repeatability` - Would recommend/repeat the session
8. `learning_objectives` - Learning objectives achieved
9. `overall_quality` - Overall session quality

---

## CORS Configuration

**Allowed Origins (Development):**
- `http://localhost:5173`
- `http://localhost:5174`
- `http://127.0.0.1:5173`
- `http://127.0.0.1:5174`
- Custom origin via `FRONTEND_URL` environment variable

**Supported:** Credentials for cookie-based sessions
