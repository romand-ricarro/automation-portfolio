# Relay Tracker - Complete Application Documentation

> **Generated:** January 2026
> **Version:** 1.0
> **Purpose:** Comprehensive documentation for LLM context and developer reference

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Structure](#2-project-structure)
3. [Tech Stack](#3-tech-stack)
4. [Backend API Reference](#4-backend-api-reference)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Database Schema](#6-database-schema)
7. [TypeScript Types](#7-typescript-types)
8. [Authentication Flow](#8-authentication-flow)
9. [Key Features](#9-key-features)
10. [Environment Variables](#10-environment-variables)
11. [Deployment](#11-deployment)
12. [UI/UX Details](#12-uiux-details)
13. [Known Patterns & Conventions](#13-known-patterns--conventions)

---

## 1. Overview

**Relay Tracker** is an internal issue tracking application that integrates with Jira Cloud. It provides a modern, user-friendly interface for creating and managing bugs, tasks, and stories while syncing data bidirectionally with Jira.

### Key Capabilities
- Create and manage issues (Bug, Task, Story)
- Sync with Jira Cloud in real-time
- Role-based access control (User, SQA, Admin)
- Email whitelist for private access
- Email and Discord notifications
- Dark/light theme support
- Keyboard shortcuts throughout
- Mobile-responsive design

### Target Users
- **Users:** Report bugs and create issues
- **SQA:** Triage and manage all issues
- **Admins:** Full system access including user and whitelist management

---

## 2. Project Structure

```
relay-tracker/
├── frontend/                    # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── issues/          # Issue-specific components
│   │   │   │   ├── IssueList.tsx
│   │   │   │   ├── CreateIssueModal.tsx
│   │   │   │   ├── FilterBar.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   ├── StatusDropdown.tsx
│   │   │   │   ├── PriorityDropdown.tsx
│   │   │   │   ├── CommentForm.tsx
│   │   │   │   ├── CommentList.tsx
│   │   │   │   ├── ActivityTimeline.tsx
│   │   │   │   ├── BulkActionBar.tsx
│   │   │   │   ├── Pagination.tsx
│   │   │   │   └── index.ts
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ShortcutsHelp.tsx
│   │   │   └── index.ts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Issues.tsx
│   │   │   ├── IssueDetail.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── AdminSettings.tsx
│   │   │   ├── WhitelistManagement.tsx
│   │   │   └── Login.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useTheme.ts
│   │   │   └── useKeyboardShortcut.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   └── auth-context.ts
│   │   ├── lib/
│   │   │   ├── api.ts           # API client
│   │   │   ├── toast.ts         # Toast utilities
│   │   │   └── errors.ts        # Error handling
│   │   ├── types/
│   │   │   └── index.ts         # All TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                     # Python Flask serverless
│   ├── api/
│   │   ├── index.py             # Flask app entry + routes
│   │   ├── requirements.txt     # Dependencies (MUST be here for Vercel)
│   │   ├── routes/
│   │   │   ├── auth.py          # Auth endpoints
│   │   │   ├── issues.py        # Issue endpoints
│   │   │   └── whitelist.py     # Whitelist endpoints
│   │   ├── services/
│   │   │   ├── jira_service.py  # Jira Cloud integration
│   │   │   └── email_service.py # SendGrid emails
│   │   ├── utils/
│   │   │   ├── auth.py          # Token verification
│   │   │   ├── database.py      # Turso DB operations
│   │   │   └── template_builder.py
│   │   ├── models/
│   │   │   └── schema.sql       # DB schema
│   │   └── templates/           # Email templates
│   └── migrate_whitelist.py
│
├── Docs/
│   ├── APP_DOCUMENTATION.md     # This file
│   ├── CONTEXT.md
│   ├── relay-project-spec.md
│   └── spec.md
│
├── vercel.json                  # Vercel config
└── README.md
```

---

## 3. Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 7.x | Build tool |
| Tailwind CSS | 4.x | Styling |
| Lucide React | 0.562.x | Icons |
| @react-oauth/google | 0.13.x | Google OAuth |
| react-markdown | 10.x | Markdown rendering |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.9+ | Runtime |
| Flask | 3.x | Web framework |
| flask-cors | 5.x | CORS support |
| atlassian-python-api | 3.x | Jira API |
| libsql-experimental | 0.0.49 | Turso DB client |
| google-auth | 2.x | OAuth verification |
| sendgrid | 6.x | Email service |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Vercel | Hosting (frontend + serverless backend) |
| Turso | Edge SQLite database |
| Jira Cloud | Issue tracking backend |
| Google Cloud | OAuth authentication |
| SendGrid | Email notifications |
| Discord | Webhook notifications |

---

## 4. Backend API Reference

**Base URL:** `/api`

### Authentication Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /auth/me` | GET | Required | Get current user info with role |
| `POST /auth/verify` | POST | Required | Verify Google ID token |
| `POST /auth/logout` | POST | Required | Log user logout |
| `PUT /auth/preferences` | PUT | Required | Update notification/theme preferences |
| `GET /auth/users` | GET | Admin | List all users |
| `PUT /auth/users/{user_id}/role` | PUT | Admin | Update user role |

### Issue Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /issues` | GET | Required | List issues with filters |
| `GET /issues/{key}` | GET | Required | Get issue details |
| `POST /issues` | POST | Required | Create new issue |
| `PUT /issues/{key}` | PUT | Required | Update issue |
| `DELETE /issues/{key}` | DELETE | Admin | Cancel issue |
| `POST /issues/{key}/comments` | POST | Required | Add comment |
| `POST /issues/{key}/attachments` | POST | Required | Upload attachment |
| `POST /issues/bulk/status` | POST | SQA/Admin | Bulk status update |
| `GET /issues/updates` | GET | Required | Get recent updates |

**Issue Query Parameters:**
- `status` - Filter by status (comma-separated)
- `priority` - Filter by priority (comma-separated)
- `type` - Filter by type (Bug, Task, Story)
- `tool` - Filter by tool/project label
- `reporter` - Filter by reporter email
- `search` - Full-text search
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 50)

### Whitelist Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /whitelist` | GET | Admin | List whitelisted emails |
| `POST /whitelist` | POST | Admin | Add email to whitelist |
| `DELETE /whitelist/{id}` | DELETE | Admin | Remove email |
| `GET /whitelist/check/{email}` | GET | Admin | Check if whitelisted |

### Health Check

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /health` | GET | None | API health check |
| `GET /` | GET | None | API info |

---

## 5. Frontend Architecture

### Pages

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | Dashboard | Auth | Home with quick actions |
| `/login` | Login | Public | Google OAuth login |
| `/issues` | Issues | Auth | Issue list with filters |
| `/issues/{key}` | IssueDetail | Auth | Single issue view |
| `/profile` | Profile | Auth | User settings |
| `/admin` | AdminSettings | Admin | User management |
| `/admin/whitelist` | WhitelistManagement | Admin | Email whitelist |

### Component Hierarchy

```
App
├── AuthProvider
│   ├── ThemeProvider
│   │   ├── Login (public)
│   │   └── ProtectedRoute
│   │       └── MainLayout
│   │           ├── Navbar
│   │           │   └── ShortcutsHelpModal
│   │           └── Page Content
│   │               ├── Dashboard
│   │               ├── Issues
│   │               │   ├── SearchBar
│   │               │   ├── FilterBar
│   │               │   ├── IssueList
│   │               │   ├── Pagination
│   │               │   ├── BulkActionBar
│   │               │   └── CreateIssueModal
│   │               ├── IssueDetail
│   │               │   ├── StatusDropdown
│   │               │   ├── PriorityDropdown
│   │               │   ├── CommentForm
│   │               │   ├── CommentList
│   │               │   └── ActivityTimeline
│   │               ├── Profile
│   │               ├── AdminSettings
│   │               └── WhitelistManagement
│   └── ToastContainer
```

### Key Hooks

**useAuth**
```typescript
const { user, isAuthenticated, isLoading, signIn, signOut, hasRole } = useAuth();
```

**useTheme**
```typescript
const { theme, isDark, setTheme, toggleTheme } = useTheme();
```

**useKeyboardShortcut**
```typescript
useKeyboardShortcut('c', () => setIsCreateModalOpen(true));
useKeyboardShortcut(['g', 'h'], () => navigate('/'));
useKeyboardShortcut('Enter', handleSubmit, { cmdOrCtrl: true });
```

**useListNavigation**
```typescript
const { selectedIndex } = useListNavigation(items, {
  onSelect: (item) => handleClick(item),
  enabled: !isModalOpen
});
```

---

## 6. Database Schema

**Database:** Turso (libsql/SQLite)

### user_roles
```sql
CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY,      -- Google OAuth sub
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',      -- 'user' | 'sqa' | 'admin'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_preferences
```sql
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  email_notifications INTEGER DEFAULT 1,
  discord_notifications INTEGER DEFAULT 0,
  theme TEXT DEFAULT 'system',   -- 'light' | 'dark' | 'system'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### activity_log
```sql
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  jira_issue_key TEXT,
  metadata TEXT,                 -- JSON string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_roles(user_id)
);
```

### allowed_emails
```sql
CREATE TABLE allowed_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  added_by TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (added_by) REFERENCES user_roles(user_id)
);
```

---

## 7. TypeScript Types

### Core Types

```typescript
// User types
type UserRole = 'user' | 'sqa' | 'admin';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
  preferences?: UserPreferences;
}

interface UserPreferences {
  email_notifications: boolean;
  discord_notifications: boolean;
  theme: 'light' | 'dark' | 'system';
}

// Issue types
type IssueType = 'Bug' | 'Task' | 'Story';
type IssuePriority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
type IssueStatus =
  | 'SQA INVESTIGATION'
  | 'TO DO'
  | 'SELECTED FOR DEVELOPMENT'
  | 'REOPENED'
  | 'IN PROGRESS'
  | 'DEV COMPLETE'
  | 'DEPLOYED TO DEV'
  | 'QA'
  | 'QA IN PROGRESS'
  | 'QA PASSED'
  | 'CANCELLED'
  | 'DONE';

type Tool =
  | 'AI'
  | 'Curator'
  | 'Metadata'
  | 'AutoEat'
  | 'Himera'
  | 'Mobile App'
  | 'MenuCurator'
  | 'Reports';

interface IssueUser {
  email: string;
  name?: string;
  avatar?: string;
}

interface Issue {
  key: string;
  summary: string;
  description?: string;
  type: IssueType | null;
  priority: IssuePriority | null;
  status: IssueStatus;
  reporter: IssueUser | null;
  assignee: IssueUser | null;
  created: string;
  updated: string;
  attachments?: Attachment[];
  comments?: IssueComment[];
  history?: IssueHistoryItem[];
}

interface Attachment {
  id: string;
  filename: string;
  content: string;  // URL
  mimeType: string;
  size: number;
  created: string;
}

interface IssueComment {
  id: string;
  author: IssueUser;
  body: string;
  created: string;
  updated?: string;
}

interface IssueHistoryItem {
  id: string;
  author: IssueUser;
  field: string;
  from: string;
  to: string;
  created: string;
}

// Whitelist types
interface WhitelistEmail {
  id: number;
  email: string;
  added_by?: string;
  added_by_name?: string;
  notes?: string;
  created_at: string;
}
```

### API Response Types

```typescript
interface IssuesResponse {
  issues: Issue[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateIssueRequest {
  summary: string;
  details: string;
  type: IssueType;
  priority: IssuePriority;
  attachmentLinks?: string;
}

interface CreateIssueResponse {
  key: string;
  message: string;
}

interface BulkUpdateResult {
  updated: number;
  failed: { key: string; error: string }[];
}
```

---

## 8. Authentication Flow

### Overview
- **Provider:** Google OAuth 2.0
- **Token Type:** Google ID Token (JWT)
- **Storage:** localStorage (`relay_id_token`)
- **Header:** `Authorization: Bearer {token}`

### Flow Diagram

```
1. User visits app
   ↓
2. No token? → Redirect to /login
   ↓
3. User clicks "Sign in with Google"
   ↓
4. Google OAuth popup → User authenticates
   ↓
5. Receive Google ID token
   ↓
6. Store token in localStorage
   ↓
7. POST /api/auth/verify with token
   ↓
8. Backend verifies with Google's public keys
   ↓
9. Check email in allowed_emails table
   ↓
10. Create/update user in user_roles
   ↓
11. Return user data with role
   ↓
12. Frontend stores user in AuthContext
   ↓
13. Redirect to dashboard
```

### Email Whitelist
- All users must have email in `allowed_emails` table
- First user setup requires manual DB insert
- Admin can manage whitelist via UI

### Role-Based Access

```python
# Backend decorator
@require_role(['admin'])
def admin_only_route():
    pass

@require_role(['admin', 'sqa'])
def admin_or_sqa_route():
    pass
```

```typescript
// Frontend hook
const { hasRole } = useAuth();

if (hasRole('admin')) {
  // Admin-only UI
}

if (hasRole(['admin', 'sqa'])) {
  // SQA or Admin UI
}
```

### Dev Bypass (Development Only)
```
DEV_BYPASS_AUTH=true
Header: X-Dev-Bypass: true
Token: dev-token-secret
```

---

## 9. Key Features

### Issue Creation
- Two-step modal: Type selection → Details
- Required fields: Type, Summary, Details, Priority
- Optional: Loom/video link for recordings
- Auto-saves draft to localStorage
- Keyboard shortcut: `C`

### Issue Filtering
- **Status:** Multi-select dropdown with all Jira workflow states
- **Priority:** Highest → Lowest
- **Type:** Bug, Task, Story
- **Tool:** AI, Curator, Metadata, etc.
- **Search:** Full-text search on summary/description
- URL persistence for shareable filter states

### Bulk Operations (SQA/Admin)
- Select multiple issues with checkboxes
- Keyboard: `X` to toggle, `Shift+X` for all
- Change status for all selected
- Visual feedback with count badge

### Comments & Activity
- Add comments with markdown support
- View activity timeline with all changes
- Keyboard: `M` to focus comment box
- Cmd/Ctrl+Enter to submit

### Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| `C` | Create new issue | Issues page |
| `/` | Focus search | Issues page |
| `R` | Refresh | Any page |
| `F` | Toggle filters | Issues page |
| `J`/`K` | Navigate list | Issues page |
| `Enter` | Open selected | Issues page |
| `X` | Toggle selection | Issues page |
| `Shift+X` | Select all | Issues page |
| `M` | Focus comment | Issue detail |
| `Escape` | Close/Go back | Modals/Detail |
| `G` then `H` | Go to Home | Global |
| `G` then `I` | Go to Issues | Global |
| `G` then `A` | Go to Admin | Global (Admin) |
| `?` | Show shortcuts | Global |

### Notifications
- **Email:** Issue creation, status changes, new comments
- **Discord:** Webhooks per issue type (Bug/Task/Story)
- User preferences for opt-in/out

### Theme Support
- Light, Dark, System modes
- Persisted in user preferences
- TailwindCSS dark: variant

---

## 10. Environment Variables

### Backend (.env)

```env
# Jira Configuration
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=BUG

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# Database (Turso)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Email (SendGrid) - Optional
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=notifications@relay-tracker.com

# Discord Webhooks - Optional
DISCORD_WEBHOOK_BUGS=https://discord.com/api/webhooks/xxx
DISCORD_WEBHOOK_TASKS=https://discord.com/api/webhooks/xxx
DISCORD_WEBHOOK_STORIES=https://discord.com/api/webhooks/xxx

# Development Only
DEV_BYPASS_AUTH=false
```

### Frontend (.env)

```env
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

# API URL (empty for production same-origin)
VITE_API_URL=

# For local development
# VITE_API_URL=http://localhost:5001
```

---

## 11. Deployment

### Vercel Configuration

**vercel.json:**
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "framework": null,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "functions": {
    "backend/api/index.py": {
      "runtime": "python3.9"
    }
  }
}
```

### Critical Deployment Notes

1. **requirements.txt location:** Must be in `backend/api/`, not `backend/`
2. **Imports:** All backend imports must be relative, not absolute
3. **VITE_API_URL:** Leave empty in production (uses same-origin)
4. **CORS:** Auto-configured for localhost and Vercel domains
5. **First user:** Manually insert email into `allowed_emails` table

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r api/requirements.txt
cd api && python index.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 12. UI/UX Details

### Design System

**Colors:**
- Primary: Orange/Red gradient (`relay-gradient`)
- Background: White/Gray (light), Gray-900 (dark)
- Accent: relay-orange (#F97316)

**Typography:**
- Font: System UI stack
- Headings: Bold, Gray-900/Gray-100
- Body: Regular, Gray-600/Gray-400

**Components:**
- Rounded corners (xl, 2xl for cards)
- Glassmorphism effect on cards
- Soft shadows
- Smooth transitions (150-300ms)

### Responsive Breakpoints

| Breakpoint | Width | Description |
|------------|-------|-------------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |

### Mobile Adaptations
- Card view instead of tables (AdminSettings, IssueList)
- Collapsed navigation in user dropdown
- Full-width inputs and buttons
- Touch-friendly tap targets (min 44px)
- Dropdown positioning to prevent overflow

---

## 13. Known Patterns & Conventions

### API Client Pattern

```typescript
// lib/api.ts
const API_URL = import.meta.env.VITE_API_URL || '';

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('relay_id_token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}
```

### Optimistic UI Updates

```typescript
const handleStatusChange = async (newStatus: IssueStatus) => {
  const previousStatus = issue.status;

  // Optimistic update
  setIssue({ ...issue, status: newStatus });

  try {
    await updateIssue(issueKey, { status: newStatus });
  } catch (err) {
    // Rollback on failure
    setIssue({ ...issue, status: previousStatus });
    showToast({ type: 'error', ... });
  }
};
```

### Form Validation Pattern

```typescript
const validateField = (field: string, value: string) => {
  const newErrors = { ...errors };

  switch (field) {
    case 'summary':
      if (!value.trim()) {
        newErrors.summary = 'Summary is required';
      } else if (value.length < 5) {
        newErrors.summary = 'Summary must be at least 5 characters';
      } else {
        delete newErrors.summary;
      }
      break;
  }

  setErrors(newErrors);
};

const handleBlur = (field: string) => {
  setTouched({ ...touched, [field]: true });
  validateField(field, values[field]);
};
```

### Click-Outside Pattern

```typescript
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

### Toast Notification Pattern

```typescript
import { showToast } from '../components';

// Success
showToast({
  type: 'success',
  title: 'Issue created',
  message: `${issueKey} has been created successfully`,
  action: {
    label: 'View',
    onClick: () => navigate(`/issues/${issueKey}`)
  }
});

// Error
showToast({
  type: 'error',
  title: 'Failed to update',
  message: error.message,
  category: 'network'  // For special error styling
});
```

### Caching Pattern (Backend)

```python
# In-memory cache with TTL
_issue_cache = {}
CACHE_TTL = 300  # 5 minutes

def get_cached_issue(key):
    if key in _issue_cache:
        data, timestamp = _issue_cache[key]
        if time.time() - timestamp < CACHE_TTL:
            return data
    return None

def set_cached_issue(key, data):
    _issue_cache[key] = (data, time.time())
```

---

## Summary

Relay Tracker is a full-stack issue tracking application with:
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Python Flask serverless on Vercel
- **Database:** Turso (edge SQLite)
- **Auth:** Google OAuth with email whitelist
- **Integration:** Jira Cloud API

The application follows modern React patterns with hooks, context, and TypeScript throughout. The backend uses Flask blueprints with role-based access control. Deployment is handled by Vercel with automatic builds and serverless functions.

---
