# 🚀 RELAY - Complete Project Specification

**App Name**: Relay  
**Tagline**: "Fast track from report to resolution"  
**Purpose**: Replace Jira Service Management with a custom bug/task tracking webapp that connects to Jira Cloud

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Users & Roles](#users--roles)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Jira SQA Template](#jira-sqa-template-format)
6. [Notifications](#notifications)
7. [MVP Features](#mvp-features-phase-1)
8. [Branding](#branding)
9. [Environment Variables](#environment-variables-needed)
10. [Database Schema](#database-schema-supabase)
11. [Antigravity Mission Plan](#-antigravity-mission-plan-10-missions)
12. [Setup Requirements](#-setup-requirements)

---

## PROJECT OVERVIEW

### THE PROBLEM

- Currently using Jira Service Management (JSM) for 80 users to report bugs/tasks
- JSM is too simplistic - no dashboards, limited filters, not customizable
- Users submit 1-2 reports daily
- Need a modern UI we can customize at will

### THE SOLUTION

Build "Relay" - a custom webapp that:

- Provides beautiful, modern UI for users
- Stores ALL data in Jira Cloud (pure passthrough architecture)
- Syncs bidirectionally with Jira Cloud in real-time
- Is fully customizable for our needs

---

## USERS & ROLES

**Total Users**: ~80 users, daily usage (1-2 reports/day)

**3 Roles** (separate permission logic from Jira):

| Role      | Permissions                                                    |
| --------- | -------------------------------------------------------------- |
| **User**  | Create tickets, view all tickets, edit/cancel own tickets only |
| **SQA**   | All User permissions + edit any ticket + bulk operations       |
| **Admin** | All SQA permissions + delete tickets + manage users/roles      |

---

## TECH STACK

### Frontend

- **React 19** + TypeScript
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **Lucide React** (icons)
- **Google Auth** (Direct OAuth 2.0 Identity Tokens)

### Backend

- **Python Flask** (serverless on Vercel)
- **libsql** (Edge-ready SQLite for Turso)
- **Jira Cloud REST API v3**

- **Turso (libsql)** (User roles, preferences, activity logs)
- **Direct Google OAuth** (Identity tokens without a broker)

### Hosting & Services

- **Vercel** (frontend + backend serverless)
- **SendGrid** (email notifications - free tier: 100/day)
- **Discord Webhooks** (notifications)

### Budget

- **$0/month** (all free tiers)

---

## ARCHITECTURE

### Data Flow

```
USER → Relay Frontend → Flask API → Jira Cloud API
                                  ↓
                              Turso (preferences/roles only)
```

### Real-time Sync Strategy

- **Polling**: Frontend polls Flask API every 60 seconds for Jira updates
- **Why**: Simpler for MVP, no webhook setup complexity
- **Future**: Add webhooks in Phase 2 for true real-time

### Jira Integration

- **Project**: Single Jira project (where devs work)
- **Issue Types**: Bug, Task, Story
- **Sync**: All changes in Jira Cloud instantly visible in Relay (via polling)
- **Template**: User's simple form → Flask transforms to SQA template → Creates in Jira

---

## JIRA SQA TEMPLATE FORMAT

When users submit a simple form, Flask transforms it into this template in Jira:

```
*ENVIRONMENT:*
Browser: {auto-detected}
OS: {auto-detected}

*STEPS TO REPRODUCE:*
[To be filled by SQA]

*EXPECTED RESULT:*
[To be filled by SQA]

*ACTUAL RESULT:*
[To be filled by SQA]

*PLEASE SEE (BEB LINK):*
{attachment_links}

*(FOR SQA ONLY) WATCHERS:*
[To be filled by SQA]

*(FOR SQA ONLY) DEVELOPERS (IF PRIORITY IS HIGHEST OR HIGH):*
[To be filled by SQA]

---
*USER PROVIDED INFORMATION:*

*Summary:* {user_summary}

*Details:* {user_details}

*Priority:* {priority}

*Reporter:* {user_email}

*Reported via:* Relay App
*Timestamp:* {datetime}

---
*IF YOU ARE EXPERIENCING SLOWDOWNS READ THIS:*
1. During our BEB recording, without stopping it, open the link to Ookla's Speedtest.
2. Press the "GO" button.
3. Wait until the test is finished.
4. Finish the BEB recording.
Note: Please share the whole screen and not just a tab when recording so BEB can catch what happens during the speed test.
```

---

## NOTIFICATIONS

### Email Notifications (SendGrid - 100/day limit)

Send emails for:

1. ✅ **Ticket created** (confirmation to reporter)
2. ✅ **Status changed** (e.g., Open → Done)
3. ✅ **SQA/Dev commented** on your ticket

Respect user preferences (can toggle on/off in settings)

### Discord Notifications

**3 separate channels by type:**

- `#bugs` - All bug reports
- `#tasks` - All tasks
- `#stories` - All stories

**Message format:**

```
🐛 [HIGH] New Bug #BUG-123
**Summary:** Dashboard not loading
**Reporter:** john@company.com
**Created:** 2 minutes ago
[View in Relay](link) | [View in Jira](link)
```

---

## MVP FEATURES (Phase 1)

### Core Features

- ✅ Google SSO login (Direct Google OAuth)
- ✅ Simple create form (summary, details, priority, type, attachments)
- ✅ View all tickets (list view)
- ✅ Filter by: Status, Priority, Type, Reporter
- ✅ Search by title/description
- ✅ View ticket details
- ✅ Edit own tickets (users) / Edit any ticket (SQA/Admin)
- ✅ Add comments
- ✅ Cancel own ticket
- ✅ Polling sync (60-second refresh from Jira)
- ✅ Email notifications (created, status changed, commented)
- ✅ Discord notifications (separate channels by type)
- ✅ Responsive design (mobile-friendly)
- ✅ Basic dashboard with stats

### Future Phase 2 Features (NOT in MVP)

- AI-powered duplicate detection
- Webhooks for true real-time sync
- Advanced analytics
- Custom fields
- Automation rules

---

## BRANDING

**Name**: Relay  
**Colors**: Orange/Red gradient (#FF6B35 → #F7931E)  
**Logo**: Signal waves or relay baton icon  
**Style**: Modern, fast, glassmorphism, clean  
**Vercel URL**: `relay-tracker.vercel.app`

---

## ENVIRONMENT VARIABLES NEEDED

### Backend (.env)

```env
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=YOUR_PROJECT_KEY
TURSO_DATABASE_URL=libsql://relay-db-yourname.turso.io
TURSO_AUTH_TOKEN=your-turso-token
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
SENDGRID_API_KEY=your-sendgrid-key
DISCORD_WEBHOOK_BUGS=your-discord-webhook-url
DISCORD_WEBHOOK_TASKS=your-discord-webhook-url
DISCORD_WEBHOOK_STORIES=your-discord-webhook-url
```

### Frontend (.env)

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_API_URL=http://localhost:5000
```

---

-- User preferences
CREATE TABLE user_preferences (
user_id TEXT PRIMARY KEY,
email_notifications INTEGER DEFAULT 1,
discord_notifications INTEGER DEFAULT 1,
theme TEXT DEFAULT 'light',
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User roles (separate from Jira)
CREATE TABLE user_roles (
user_id TEXT PRIMARY KEY,
email TEXT NOT NULL,
role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'sqa', 'admin')),
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity log
CREATE TABLE activity_log (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id TEXT,
action TEXT NOT NULL,
jira_issue_key TEXT,
metadata TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

```

**Note**: First user to sign up automatically gets 'admin' role

---

## 🤖 ANTIGRAVITY MISSION PLAN (10 Missions)

### MISSION 1: Project Foundation (3-4h review time)

```

Set up full-stack project for "Relay" - a bug/task tracking app.

FRONTEND SETUP:

- React 19 + TypeScript + Vite
- Tailwind CSS configured with orange/red gradient theme (#FF6B35 → #F7931E)
- Lucide React icons installed
- Project structure:
  src/
  components/
  pages/
  lib/
  hooks/
  types/
  App.tsx
  main.tsx
- Dark/Light mode toggle
- Responsive layout framework
- Loading states component
- Error boundary

BACKEND SETUP:

- Python Flask app
- Project structure:
  api/
  routes/
  services/
  utils/
  models/
  index.py
- vercel.json configuration for serverless deployment
- requirements.txt with dependencies:
  - Flask
  - flask-cors
  - supabase
  - atlassian-python-api
  - python-dotenv
  - requests
- Environment variables setup (.env.example)
- CORS configured for localhost + Vercel
- Health check endpoint: GET /api/health

ENVIRONMENT VARIABLES NEEDED:
Backend (.env):

- JIRA_URL=https://yourcompany.atlassian.net
- JIRA_EMAIL=your-email@company.com
- JIRA_API_TOKEN=your-token
- JIRA_PROJECT_KEY=YOUR_PROJECT
- SUPABASE_URL=your-supabase-url
- SUPABASE_KEY=your-supabase-key
- SENDGRID_API_KEY=your-sendgrid-key
- DISCORD_WEBHOOK_BUGS=webhook-url
- DISCORD_WEBHOOK_TASKS=webhook-url
- DISCORD_WEBHOOK_STORIES=webhook-url

Frontend (.env):

- VITE_SUPABASE_URL=your-supabase-url
- VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
- VITE_API_URL=http://localhost:5000

BRANDING:

- App name: Relay
- Primary colors: Orange/Red gradient
- Style: Modern, glassmorphism, fast

DELIVERABLES:

- Both projects running locally
- README.md with setup instructions
- .env.example files
- Clean folder structure
- Git repository initialized (relay-frontend, relay-backend)

```

---

### MISSION 2: Supabase Setup + Google SSO (4-5h review time)

```

Implement Google SSO authentication for Relay using Supabase.

DATABASE SCHEMA (Supabase SQL Editor):

-- User preferences
CREATE TABLE user_preferences (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
email_notifications BOOLEAN DEFAULT true,
discord_notifications BOOLEAN DEFAULT true,
theme TEXT DEFAULT 'light',
created_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(user_id)
);

-- User roles (separate from Jira permissions)
CREATE TABLE user_roles (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
role TEXT NOT NULL CHECK (role IN ('user', 'sqa', 'admin')),
created_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(user_id)
);

-- Activity log
CREATE TABLE activity_log (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
user_id UUID REFERENCES auth.users(id),
action TEXT NOT NULL,
jira_issue_key TEXT,
metadata JSONB,
created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

BACKEND (Flask):

- Supabase client initialization
- JWT verification middleware (@require_auth decorator)
- Role checking middleware (@require_role('sqa') decorator)
- Routes:
  POST /api/auth/verify - Verify Google token
  GET /api/auth/me - Get current user + role
  POST /api/auth/logout - Clear session
  GET /api/users - List all users (admin only)
  PUT /api/users/{id}/role - Update user role (admin only)

FRONTEND (React):

- Supabase Auth setup with Google provider
- Login page (clean, centered with Google button)
- Auth context/provider (useAuth hook)
- Protected routes component
- User profile dropdown in navbar
- Logout functionality
- Token refresh handling
- Role-based component rendering

DESIGN:

- Centered login card with glassmorphism
- "Sign in with Google" button with icon
- Orange/red accent colors
- Loading spinner during auth
- Error messages for failed auth
- Redirect to dashboard after login
- Navbar with user avatar + role badge

DEFAULT ADMIN:

- First user to sign up gets 'admin' role automatically
- Admins can assign 'sqa' or 'user' roles to others

PERMISSION MATRIX:

- User: Create tickets, view all, edit/cancel own only
- SQA: User permissions + edit any ticket + bulk operations
- Admin: SQA permissions + delete + manage users/roles

DELIVERABLES:

- Working Google SSO
- Role-based access control
- User management page (admin only)
- Persistent sessions

```

---

### MISSION 3: Jira Cloud API Integration (5-6h review time)

```

Build Flask service layer for Jira Cloud API with template transformation for Relay.

JIRA SERVICE (api/services/jira_service.py):

Core functions:

1. fetch_issues(filters=None, search=None)

   - Build JQL query from filters
   - Support: status, priority, type, reporter
   - Return paginated results (50 per page)
   - Include: key, summary, status, priority, assignee, reporter, created, updated

2. get_issue(issue_key)

   - Fetch single issue with all details
   - Include comments, attachments, history
   - Return formatted data

3. create_issue(issue_data, user_email)
   - Transform simple user input into SQA template
   - Auto-detect browser/OS from user agent
   - Template format (EXACT format required):

_ENVIRONMENT:_
Browser: {detected_browser}
OS: {detected_os}

_STEPS TO REPRODUCE:_
[To be filled by SQA]

_EXPECTED RESULT:_
[To be filled by SQA]

_ACTUAL RESULT:_
[To be filled by SQA]

_PLEASE SEE (BEB LINK):_
{attachment_links}

_(FOR SQA ONLY) WATCHERS:_
[To be filled by SQA]

_(FOR SQA ONLY) DEVELOPERS (IF PRIORITY IS HIGHEST OR HIGH):_
[To be filled by SQA]

---

_USER PROVIDED INFORMATION:_

_Summary:_ {user_summary}

_Details:_ {user_details}

_Priority:_ {priority}

_Reporter:_ {user_email}

_Reported via:_ Relay App
_Timestamp:_ {datetime}

---

_IF YOU ARE EXPERIENCING SLOWDOWNS READ THIS:_

1. During our BEB recording, without stopping it, open the link to Ookla's Speedtest.
2. Press the "GO" button.
3. Wait until the test is finished.
4. Finish the BEB recording.
   Note: Please share the whole screen and not just a tab when recording so BEB can catch what happens during the speed test.

5. update_issue(issue_key, fields)

   - Update status, priority, assignee, etc.
   - Validate user can only edit own issues (unless SQA/Admin)

6. add_comment(issue_key, comment_text, user_email)

   - Add comment with user attribution

7. upload_attachment(issue_key, file)

   - Handle file upload to Jira
   - Support: images, PDFs, videos, zip
   - Max size: 10MB

8. check_user_can_edit(issue_key, user_email)
   - Return true if user is reporter OR has SQA/Admin role

ERROR HANDLING:

- Retry logic (3 attempts with exponential backoff)
- Rate limiting awareness
- Meaningful error messages
- Log all Jira API calls

ROUTES (api/routes/issues.py):
GET /api/issues - List issues with filters
GET /api/issues/{key} - Get single issue
POST /api/issues - Create issue
PUT /api/issues/{key} - Update issue
POST /api/issues/{key}/comments - Add comment
POST /api/issues/{key}/attachments - Upload file
DELETE /api/issues/{key} - Cancel issue (admin only)

JIRA CONNECTION:

- Single project only
- Issue types: Bug, Task, Story
- Use Jira Cloud REST API v3
- Authentication: API token (Bearer auth)

DELIVERABLES:

- jira_service.py with all functions
- Template transformation working
- Browser/OS detection
- Error handling
- Unit tests for template generation

```

---

### MISSION 4: Issue List View + Filters (5-6h review time)

```

Create beautiful, filterable issue list for Relay matching our design system.

BACKEND:
GET /api/issues endpoint with query params:

- status: string (e.g., "Open,In Progress")
- priority: string (e.g., "Highest,High,Medium,Low,Lowest")
- type: string (e.g., "Bug,Task,Story")
- reporter: string (email)
- search: string (searches summary + description)
- page: number (default 1)
- limit: number (default 50)

Returns:
{
issues: [...],
total: number,
page: number,
totalPages: number
}

FRONTEND:
Design inspired by Linear/Notion with Relay branding:

- Clean table/list view
- Glassmorphism cards
- Orange/red accent colors
- Smooth animations

Each row shows:

- Issue key (clickable) - e.g., "BUG-123"
- Type icon (bug/task/story) with color
- Summary (truncated if long)
- Status badge (colored by status)
- Priority indicator (icon + color)
- Reporter avatar (from Google profile)
- Created date (relative: "2 hours ago")
- Updated date

Filter bar (sticky header):

- Multi-select dropdowns:
  - Status (Open, In Progress, In Review, Done, Cancelled)
  - Priority (Highest, High, Medium, Low, Lowest)
  - Type (Bug, Task, Story)
  - Reporter (dropdown of all users)
- Search input with debounce (300ms)
- "Clear filters" button
- Active filter count badge

Features:

- Infinite scroll OR pagination
- Loading skeletons
- Empty state: "No issues found. Try adjusting filters."
- Responsive (table on desktop, cards on mobile)
- Click row → navigate to detail view
- Keyboard navigation (arrow keys, enter to open)

State management:

- URL query params for filters (shareable links)
- Persist filter state in localStorage
- Auto-refresh every 60 seconds (polling from Jira)

DESIGN SPECS:

- Use Tailwind utilities
- Dark mode support
- Hover effects on rows
- Smooth transitions
- Status colors:
  - Open: blue
  - In Progress: yellow
  - In Review: purple
  - Done: green
  - Cancelled: gray
- Priority colors:
  - Highest: red
  - High: orange (#FF6B35)
  - Medium: yellow
  - Low: gray
  - Lowest: slate

DELIVERABLES:

- Issue list component
- Filter components
- Search component
- Pagination component
- Loading states
- Empty states
- Responsive design

```

---

### MISSION 5: Issue Detail View (4-5h review time)

```

Build detailed issue view for Relay with inline editing.

LAYOUT:
Split view or modal (your choice):

- Left: Issue details
- Right: Activity timeline + comments

ISSUE DETAILS SECTION:
Header:

- Issue key + type icon
- Summary (editable inline for own issues or if SQA/Admin)
- Status dropdown (changes status on select)
- Priority dropdown

Body:

- Description (show formatted SQA template from Jira)
- Attachments section (download buttons)
- Metadata:
  - Reporter (avatar + name)
  - Created date
  - Updated date
  - Assignee (editable by SQA/Admin)

EDIT FUNCTIONALITY:

- Click summary → edit mode
- Click description → rich text editor
- Auto-save on blur OR explicit Save button
- Show "Saving..." indicator
- Optimistic UI updates
- Permission check:
  - Users can edit own issues only
  - SQA/Admin can edit any issue

COMMENTS SECTION:

- List all comments (newest first)
- Each comment shows:
  - Author avatar + name
  - Timestamp (relative)
  - Comment text
  - "via Jira" badge if from dev
- Add comment box:
  - Text area
  - Attach files
  - Submit button
  - Shows "Posting..." state

ACTIVITY TIMELINE:

- Show recent changes:
  - Status changed: Open → In Progress
  - Priority changed: Medium → High
  - Comment added
  - Attachment added
- Timestamp for each event
- Icon for event type

ACTIONS:

- "Cancel Issue" button (for own issues - sets status to Cancelled)
- "Delete" button (admin only)
- "Copy Link" button
- "Open in Jira" button (new tab)

DESIGN:

- Clean typography
- Generous spacing
- Glassmorphism cards with orange/red accents
- Smooth animations
- Loading skeletons
- Error states

DELIVERABLES:

- Issue detail component
- Inline editing
- Comments component
- Activity timeline
- Permission-based UI

```

---

### MISSION 6: Create Issue Form (4-5h review time)

```

Build intuitive issue creation form for Relay with validation.

FORM DESIGN:
Modal or slide-over panel (your choice)

Steps:

1. Select Type (Bug/Task/Story) - large buttons with icons
2. Fill Details

FIELDS:

- Type selector (required)

  - Bug (red icon 🐛)
  - Task (blue icon 📋)
  - Story (green icon 📖)

- Summary (required)

  - Text input
  - Max 255 characters
  - Character counter
  - Validation: not empty
  - Placeholder: "Summarize the issue briefly"

- Details (required)

  - Rich text editor (simple toolbar)
  - Toolbar: Bold, Italic, List, Link
  - Placeholder: "Provide as much detail as possible about the issue"
  - Min 10 characters

- Priority (required)

  - Dropdown: Highest, High, Medium (default), Low, Lowest
  - Color indicators matching Relay branding
  - Helper text: "Select according to Issue Reporting SOP"

- Attachments (optional)
  - Drag & drop zone
  - File picker button
  - Multiple files allowed
  - Show preview for images
  - File size limit: 10MB per file
  - Allowed types: images, PDFs, videos, zip
  - Show upload progress
  - Helper text: "Attach screenshots, videos, or relevant files"

VALIDATION:

- Real-time validation on blur
- Show errors below fields in red
- Disable submit until all required fields valid
- Clear error messages:
  - "Summary is required"
  - "Details must be at least 10 characters"
  - "File size exceeds 10MB limit"

SUBMIT FLOW:

1. Click "Submit"
2. Validate all fields
3. Show loading spinner
4. Disable form
5. Call POST /api/issues (backend transforms to SQA template)
6. If success:
   - Show success toast: "Issue BUG-123 created!"
   - Send email notification
   - Send Discord notification to appropriate channel
   - Redirect to issue detail
   - Close modal
7. If error:
   - Show error message
   - Re-enable form
   - Don't lose form data

DESIGN:

- Progressive disclosure (type first, then details)
- Clear visual hierarchy
- Smooth transitions
- Glassmorphism with orange/red accents
- Dark mode support
- Mobile-friendly

DELIVERABLES:

- Create form component
- Validation logic
- File upload handling
- Success/error states
- Responsive design

```

---

### MISSION 7: Notifications System (5-6h review time)

```

Implement email + Discord notifications for Relay.

EMAIL NOTIFICATIONS (SendGrid - 100/day limit):

Backend service (api/services/notification_service.py):

send_email(to, subject, template_name, data):

- Use SendGrid API
- HTML email templates with Relay branding (orange/red colors)
- Track sent emails in activity_log

Templates needed:

1. issue_created.html

   - Subject: "Issue {key} created: {summary}"
   - Body: Issue details + link to view in Relay

2. status_changed.html

   - Subject: "Issue {key} status changed to {new_status}"
   - Body: Old status → New status + link

3. comment_added.html
   - Subject: "New comment on {key}"
   - Body: Comment text + commenter + link

Email triggers (only send if user has email_notifications = true):

- Issue created → Send to reporter
- Status changed → Send to reporter
- Comment added → Send to reporter (if someone else commented)

DISCORD NOTIFICATIONS:

3 separate webhooks for each type:

- DISCORD_WEBHOOK_BUGS → #bugs channel
- DISCORD_WEBHOOK_TASKS → #tasks channel
- DISCORD_WEBHOOK_STORIES → #stories channel

Discord message format:
🐛 [HIGH] New Bug #BUG-123
**Summary:** Dashboard not loading
**Reporter:** john@company.com
**Created:** 2 minutes ago
[View in Relay](link) | [View in Jira](link)

Type-specific emojis:

- Bug: 🐛
- Task: 📋
- Story: 📖

Triggers:

- Issue created → Post to respective channel
- Status changed to "Done" → Post update with ✅

Backend routes:
POST /api/notifications/test - Test email/Discord (admin only)

Settings page (frontend):

- Toggle email notifications on/off
- Toggle Discord mentions on/off
- Save to user_preferences table
- Relay branding

DELIVERABLES:

- Email service with SendGrid
- Discord webhook service
- HTML email templates with Relay branding
- Notification preferences UI
- Test endpoint

```

---

### MISSION 8: Dashboard + Stats (3-4h review time)

```

Create overview dashboard for Relay with key metrics.

BACKEND:
GET /api/stats endpoint returns:
{
total: number,
open: number,
in_progress: number,
done: number,
by_type: { Bug: number, Task: number, Story: number },
by_priority: { Highest: number, High: number, Medium: number, Low: number, Lowest: number },
my_issues: { total: number, open: number },
recent_activity: [...] // Last 10 updates
}

FRONTEND DASHBOARD:

Layout (grid):
┌─────────────────────────────────────┐
│ Welcome back, {User Name}! │
│ {Role Badge} │
├─────────┬─────────┬─────────────────┤
│ Total │ Open │ In Progress │
│ {count} │ {count} │ {count} │
├─────────┴─────────┴─────────────────┤
│ Issues by Type (Donut Chart) │
│ 🐛 Bugs: {count} │
│ 📋 Tasks: {count} │
│ 📖 Stories: {count} │
├─────────────────────────────────────┤
│ Issues by Priority (Bar Chart) │
│ ████████ Highest ({count}) │
│ ██████ High ({count}) │
│ ████ Medium ({count}) │
│ ██ Low ({count}) │
├─────────────────────────────────────┤
│ My Assigned Issues │
│ {list of 5 most recent} │
│ [View All] │
├─────────────────────────────────────┤
│ Recent Activity │
│ {timeline of last 10 updates} │
└─────────────────────────────────────┘

Charts:

- Use Recharts or Chart.js
- Responsive
- Animated on load
- Relay colors (orange/red gradients)
- Dark mode support

Stats cards:

- Glassmorphism
- Large numbers
- Trend indicators (if available)
- Click to filter issues

Recent activity:

- Mini timeline
- Icons for event types
- Relative timestamps
- "View all" link to activity page

BRANDING:

- Relay colors throughout
- Orange/red accents
- Modern, clean design

DELIVERABLES:

- Dashboard page
- Stats API endpoint
- Charts components
- Responsive grid layout

```

---

### MISSION 9: Polling System (3-4h review time)

```

Implement 60-second polling for real-time-ish updates in Relay.

FRONTEND POLLING HOOK:

useJiraPolling(intervalMs = 60000):

- Fetches /api/issues/updates every 60 seconds
- Compares with local state
- If changes detected:
  - Update local state
  - Show toast: "Issue BUG-123 updated"
  - Highlight changed rows briefly (orange glow)
- Pause polling when tab not active (visibility API)
- Resume when tab becomes active

BACKEND:
GET /api/issues/updates?since={timestamp}

- Returns issues updated since timestamp
- Include: key, summary, status, priority, updated_at
- Use Jira JQL: updated >= "{timestamp}"

VISUAL INDICATORS:

- "Live" badge in navbar (green dot + "Live")
- Toast notifications for updates (Relay branded)
- Row highlight animation (orange fade → transparent)
- "Updated 5 seconds ago" timestamp

OPTIMIZATION:

- Only poll if user is authenticated
- Don't poll on login/create pages
- Clear interval on component unmount
- Debounce rapid updates

ERROR HANDLING:

- If polling fails 3 times → show warning
- "Connection lost" banner
- Retry with exponential backoff
- Resume normal polling when recovered

DELIVERABLES:

- Polling hook
- Updates endpoint
- Visual indicators with Relay branding
- Error handling
- Performance optimization

```

---

### MISSION 10: Deployment + Polish (4-5h review time)

```

Production-ready deployment of Relay to Vercel.

PRODUCTION CHECKLIST:

Backend:

- Environment variables in Vercel
- Error logging (console + optional Sentry)
- Rate limiting (Flask-Limiter)
- Security headers (CORS, CSP)
- Health check endpoint
- API documentation (OpenAPI/Swagger)

Frontend:

- Error boundaries
- 404 page
- Loading states everywhere
- Optimistic UI updates
- Keyboard shortcuts (Cmd+K for search)
- Meta tags (title: "Relay - Bug & Task Tracker", description)
- Favicon (Relay branding)

Vercel Configuration:

- Create vercel.json:
  {
  "version": 2,
  "builds": [
  { "src": "api/index.py", "use": "@vercel/python" },
  { "src": "package.json", "use": "@vercel/static-build" }
  ],
  "routes": [
  { "src": "/api/(.*)", "dest": "/api/index.py" },
  { "src": "/(.*)", "dest": "/index.html" }
  ]
  }

- Set environment variables in Vercel dashboard
- Configure Vercel URL: relay-tracker.vercel.app
- Enable SSL/HTTPS (automatic)

Testing:

- Test all features in production
- Test on mobile devices
- Test email notifications (SendGrid)
- Test Discord webhooks (all 3 channels)
- Load test (simulate 80 users)
- Test Google SSO in production

Documentation:

- README.md with:
  - Relay project overview
  - Setup instructions
  - Environment variables
  - Deployment steps
  - User guide
  - Admin guide (managing roles)
  - Jira Cloud setup guide

DELIVERABLES:

- Deployed to Vercel (relay-tracker.vercel.app)
- All environment variables set
- SSL working
- Documentation complete
- Production tested with 80 users

```

---

### MISSION 11: Email Whitelist Authentication + README Updates (5-6h review time)

```

Implement private access control via email whitelist and update all documentation.

PROBLEM:

- Currently anyone with a Google account can sign in
- Need private access for internal team only
- README files have outdated tech stack information (Supabase → Turso/Google OAuth)
- Missing comprehensive setup documentation

SOLUTION:
Implement email whitelist authentication (Option B) + update all README files.

---

PART 1: DATABASE SCHEMA

Create new table for email whitelist:

CREATE TABLE IF NOT EXISTS allowed_emails (
id INTEGER PRIMARY KEY AUTOINCREMENT,
email TEXT NOT NULL UNIQUE,
added_by TEXT,
notes TEXT,
created_at TEXT DEFAULT (datetime('now')),
FOREIGN KEY (added_by) REFERENCES user_roles(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_allowed_emails_email ON allowed_emails(email);

Migration Script (backend/migrate_whitelist.py):

- Check if table exists
- Create table if missing
- Automatically whitelist all existing users from user_roles
- Print summary of whitelisted emails
- Safe to run multiple times (idempotent)

---

PART 2: BACKEND - DATABASE UTILITIES

Update backend/api/utils/database.py:

Add new functions (append to end of file):

1. is_email_whitelisted(email: str) -> bool

   - Check if email exists in allowed_emails table
   - Case-insensitive comparison
   - Return True/False

2. get_all_whitelisted_emails() -> list

   - Get all whitelisted emails with metadata
   - Order by created_at DESC
   - Return list of dicts with: id, email, added_by, notes, created_at

3. add_email_to_whitelist(email: str, added_by: str, notes: str = None) -> dict

   - Add email to whitelist
   - Check if already exists (raise ValueError if duplicate)
   - Store email in lowercase
   - Return added email record

4. remove_email_from_whitelist(email: str) -> bool
   - Remove email from whitelist
   - Check if exists (raise ValueError if not found)
   - Return True on success

Modify create_user() function:

- Add whitelist check at the beginning
- If email not whitelisted, raise ValueError with message:
  "Email {email} is not authorized to access this application. Please contact an administrator."
- Continue with existing user creation logic if whitelisted

---

PART 3: BACKEND - API ROUTES

Create new file: backend/api/routes/whitelist.py

Admin-only endpoints for managing email whitelist:

GET /api/whitelist

- List all whitelisted emails
- Requires: @require_auth, @require_role("admin")
- Returns: { emails: [...], total: number }

POST /api/whitelist

- Add email to whitelist
- Requires: @require_auth, @require_role("admin")
- Body: { email: string, notes?: string }
- Validates email format (must contain @ and .)
- Returns: { success: true, email: {...} }
- Logs activity

DELETE /api/whitelist/{id}

- Remove email from whitelist
- Requires: @require_auth, @require_role("admin")
- Prevents removing your own email
- Returns: { success: true, message: string }
- Logs activity

GET /api/whitelist/check/{email}

- Check if email is whitelisted
- Requires: @require_auth, @require_role("admin")
- Returns: { email: string, whitelisted: boolean }

Update backend/api/index.py:

- Import whitelist_bp
- Register blueprint: app.register_blueprint(whitelist_bp)
- Add to root endpoint documentation

---

PART 4: FRONTEND - WHITELIST MANAGEMENT UI

Create new file: frontend/src/pages/WhitelistManagement.tsx

Admin page for managing whitelisted emails:

LAYOUT:

- Header with icon + title "Email Whitelist"
- Description: "Manage who can access Relay"
- Search bar + "Add Email" button
- Table/list of whitelisted emails
- Info box: "Only whitelisted emails can sign in with Google OAuth"

TABLE COLUMNS:

- Email address
- Added by (user name/email)
- Notes
- Date added
- Actions (Remove button)

ADD EMAIL MODAL:

- Email input (required, validated)
- Notes textarea (optional)
- Cancel + Add buttons
- Validation:
  - Email format check
  - Duplicate check
  - Show error if already exists
- Success toast on add

REMOVE EMAIL CONFIRMATION:

- Confirm dialog before removing
- Show email being removed
- Prevent removing own email
- Success toast on remove

FEATURES:

- Search/filter emails
- Loading states
- Error handling
- Responsive design
- Glassmorphism style matching AdminSettings
- Orange/red accent colors

---

PART 5: FRONTEND - API CLIENT

Update frontend/src/lib/api.ts:

Add whitelist functions:

export async function fetchWhitelistedEmails(): Promise<WhitelistEmail[]>
export async function addEmailToWhitelist(email: string, notes?: string): Promise<WhitelistEmail>
export async function removeEmailFromWhitelist(emailId: number): Promise<void>
export async function checkEmailWhitelisted(email: string): Promise<boolean>

Update frontend/src/types/index.ts:

Add type:
export interface WhitelistEmail {
id: number;
email: string;
added_by: string | null;
notes: string | null;
created_at: string;
}

---

PART 6: FRONTEND - NAVIGATION

Update frontend/src/App.tsx:

- Import WhitelistManagementPage
- Add route: <Route path="/admin/whitelist" element={<WhitelistManagementPage />} />

Update frontend/src/components/Navbar.tsx:

- Add "Email Whitelist" link in admin dropdown
- Only show if hasRole("admin")
- Link to /admin/whitelist

---

PART 7: DOCUMENTATION UPDATES

Create NEW file: README.md (root of project)

Content:

- Project overview with tagline
- Features list (modern UI, private access, Jira sync, roles, notifications)
- Tech stack (React 19, Flask, Turso, Direct Google OAuth)
- Access control explanation (email whitelist)
- User roles table
- Project structure
- Getting started (prerequisites, setup steps)
- Environment variables (complete tables for backend + frontend)
- First-time setup: How to add first admin email via Turso CLI
- Deployment instructions (Vercel)
- API endpoints list
- Branding info
- Security notes
- License

Update frontend/README.md:

Replace entire file with Relay-specific content:

- Tech stack
- Project structure (src/ breakdown)
- Development setup
- Available scripts (dev, build, preview, lint)
- Environment variables
- Features (auth, issue management, admin, UI/UX)
- Code style
- Deployment
- Links to other docs

Create NEW file: backend/README.md

Content:

- Tech stack (Flask, Turso, Jira API, Google OAuth)
- Project structure (api/ breakdown)
- Development setup
- Environment variables with descriptions
- How to get API credentials (Jira, Google, Turso)
- Database schema explanation
- API endpoints list
- Authentication flow diagram
- Jira integration explanation
- Deployment
- Development tips (testing, migrations, debugging)

Update Docs/README.md:

Fix outdated references:

- Line 13: "Supabase Auth" → "Direct Google OAuth 2.0"
- Line 25: "Supabase Auth" → "Direct Google OAuth 2.0"
- Line 30: "Supabase PostgreSQL" → "Turso (libsql)"
- Lines 89-91: Replace Supabase env vars with Google OAuth + Turso
- Lines 143-157: Update environment variables table (remove Supabase, add Turso + Google OAuth)

---

PART 8: FIRST-TIME SETUP INSTRUCTIONS

Add to all README files:

IMPORTANT: First-Time Deployment
Before anyone can sign in, add the first admin email to the whitelist:

Using Turso CLI:
turso db shell your-database-name

In Turso shell:
INSERT INTO allowed_emails (email, notes)
VALUES ('your-email@example.com', 'First admin user');

The first user to sign in will automatically become admin.
After that, use the Admin > Email Whitelist page to add more users.

---

TESTING CHECKLIST:

Database:
✅ Run migrate_whitelist.py successfully
✅ Verify allowed_emails table created
✅ Existing users automatically whitelisted
✅ Can query whitelisted emails

Backend API:
✅ GET /api/whitelist returns all emails (admin only)
✅ POST /api/whitelist adds new email (admin only)
✅ DELETE /api/whitelist/{id} removes email (admin only)
✅ Cannot remove own email
✅ Non-admin users get 403 Forbidden
✅ Duplicate emails return error
✅ Invalid email format returns error

Authentication:
✅ Non-whitelisted email cannot sign in
✅ Error message is clear and helpful
✅ Whitelisted email can sign in
✅ New user created successfully
✅ Existing users still work

Frontend UI:
✅ Admin can access /admin/whitelist
✅ Non-admin gets access denied
✅ Can view all whitelisted emails
✅ Can add new email with notes
✅ Can remove email (not own)
✅ Search/filter works
✅ Loading states show
✅ Error messages display
✅ Success toasts appear
✅ Responsive on mobile

Documentation:
✅ Root README.md is accurate
✅ Frontend README.md is Relay-specific
✅ Backend README.md has setup instructions
✅ Docs/README.md has no Supabase references
✅ All environment variables documented
✅ First-time setup instructions clear
✅ Links between docs work

Deployment:
✅ Deploy to Vercel
✅ Add admin email to production Turso
✅ Test sign-in on production
✅ Verify whitelist management works
✅ Test adding/removing emails in production

---

DELIVERABLES:

Backend:

- migrate_whitelist.py (migration script)
- Updated database.py with whitelist functions
- New whitelist.py routes file
- Updated index.py with whitelist blueprint

Frontend:

- WhitelistManagement.tsx page
- Updated api.ts with whitelist functions
- Updated types/index.ts with WhitelistEmail type
- Updated App.tsx with route
- Updated Navbar.tsx with link

Documentation:

- README.md (root) - NEW
- frontend/README.md - UPDATED
- backend/README.md - NEW
- Docs/README.md - UPDATED

All files follow Relay branding (orange/red gradient, glassmorphism, modern design).

```

---

### MISSION 12: UX Improvements - Error Messages + Keyboard Shortcuts (6-8h review time)

```

Enhance user experience with better error handling and keyboard navigation.

PROBLEM:

- Non-whitelisted users get silent redirect (no error message)
- Jira API errors show generic "something went wrong"
- Form validation errors are unclear
- No keyboard shortcuts for power users
- Everything requires mouse/touch interaction

SOLUTION:
Implement comprehensive error messaging and keyboard shortcuts for efficient navigation.

---

PART 1: BETTER ERROR MESSAGES

A. WHITELIST ERROR (Priority 1)

Scenario: User not in whitelist tries to sign in

Frontend: hooks/useAuth.tsx or context/auth-context.tsx

- Catch whitelist error from backend
- Show persistent toast notification (doesn't auto-dismiss)
- Message:
  🚫 Access Denied
  Your email (user@example.com) is not authorized to access Relay.
  Please contact your administrator to request access.
- Action button: "Copy Email" (copies email to clipboard)
- Design: Red/orange gradient, glassmorphism
- User must manually dismiss

B. JIRA API ERRORS

Categorize errors by type:

1. Authentication Errors (401)
   User sees: "Connection to Jira failed. Please contact support."
   Admin sees:
   ❌ Jira API Error
   JIRA_API_TOKEN invalid or expired

   Technical Details:
   • Status: 401 Unauthorized
   • Endpoint: POST /rest/api/3/issue
   • Time: 2026-01-10 16:08:43

   Action Required:
   Update JIRA_API_TOKEN in environment variables.

   [Copy Error Details] [View Error Logs]

2. Network Errors (timeout, no connection)
   Message: "Unable to reach Jira. Check your connection."
   Action: [Retry] button
   Auto-retry: Once automatically, then show manual retry

3. Rate Limit Errors (429)
   Message: "Too many requests. Please wait X seconds."
   Show countdown timer
   Auto-retry after countdown

4. Server Errors (500)
   Message: "Jira is experiencing issues. Try again later."
   Action: [Retry] button

Implementation:

- Create error categorization utility
- Map HTTP status codes to user-friendly messages
- Admin role check: if admin, show technical details
- All errors logged to activity_log table

C. FORM VALIDATION ERRORS

Real-time validation (on blur, not just submit):

Summary field:

- "Summary is required"
- "Summary must be between 10-255 characters (currently: 5)"

Description field:

- "Description is required"
- "Description must be at least 10 characters (currently: 3)"

Attachments:

- "File 'screenshot.png' exceeds 10MB limit (12.5MB)"
- "File type '.exe' is not allowed. Allowed: images, PDFs, videos, zip"

Priority:

- "Please select a priority level"

Visual indicators:

- Red border on invalid field
- Error icon next to field
- Error message below field
- Green checkmark when valid

D. NETWORK/CONNECTIVITY ERRORS

Offline detection:

- Show banner: "You're offline. Changes will sync when reconnected."
- Disable form submissions
- Queue actions for when online

Slow connection:

- Show loading message: "Taking longer than usual... Still trying..."
- After 10 seconds: "This is taking a while. Check your connection."

Failed requests:

- Show error with retry button
- Auto-retry once (exponential backoff)
- Then show manual retry option

E. TOAST NOTIFICATION SYSTEM

Duration rules:

- Success toasts: 3 seconds (auto-dismiss)
- Info toasts: 5 seconds (auto-dismiss)
- Minor errors: 10 seconds (auto-dismiss)
- Critical errors (whitelist, auth): Never auto-dismiss (user must close)

Position: Top right corner
Style: Glassmorphism, orange/red gradient for errors
Stack: Show up to 3 toasts, queue others

F. ADMIN ERROR LOGS PAGE

Create new page: Admin > Error Logs

Features:

- List all errors from activity_log
- Filter by: Error type, Date range, User
- Search errors
- View full technical details
- Export to CSV
- Clear old logs (older than 30 days)

Table columns:

- Timestamp
- User
- Error type
- Message
- Action (View Details)

Detail view:

- Full error message
- Stack trace (if available)
- Request/response data
- User agent
- Copy button for all details

---

PART 2: KEYBOARD SHORTCUTS

A. GLOBAL SHORTCUTS (work anywhere)

| Shortcut | Action              | Implementation                  |
| -------- | ------------------- | ------------------------------- |
| C        | Create new issue    | Open create modal               |
| /        | Focus search        | Focus search input              |
| ?        | Show shortcuts help | Open help modal                 |
| Esc      | Close modal/dialog  | Close active modal              |
| G then H | Go to Home          | Navigate to /                   |
| G then I | Go to Issues        | Navigate to /issues             |
| G then A | Go to Admin         | Navigate to /admin (admin only) |

B. ISSUE LIST SHORTCUTS

| Shortcut  | Action              | Context                |
| --------- | ------------------- | ---------------------- |
| ↑ / ↓     | Navigate issues     | Move selection up/down |
| J / K     | Next/Previous (vim) | Same as ↑/↓            |
| Enter     | Open selected issue | Navigate to detail     |
| R         | Refresh list        | Reload from Jira       |
| F         | Open filters        | Show filter panel      |
| X         | Select/deselect     | For bulk operations    |
| Shift + X | Select all          | Select all visible     |

C. ISSUE DETAIL SHORTCUTS

| Shortcut         | Action         | Context                  |
| ---------------- | -------------- | ------------------------ |
| E                | Edit issue     | Enter edit mode          |
| M                | Add comment    | Focus comment box        |
| A                | Add attachment | Open file picker         |
| D                | Delete issue   | Admin only, show confirm |
| Cmd/Ctrl + Enter | Save changes   | Submit form              |
| Esc              | Cancel editing | Exit edit mode           |

D. FORM SHORTCUTS

| Shortcut         | Action         | Context            |
| ---------------- | -------------- | ------------------ |
| Tab              | Next field     | Move to next input |
| Shift + Tab      | Previous field | Move to previous   |
| Cmd/Ctrl + Enter | Submit form    | Save/create        |
| Esc              | Cancel/close   | Close form         |

E. IMPLEMENTATION

Create custom hook: useKeyboardShortcut

```typescript
// Usage example
useKeyboardShortcut("c", () => openCreateIssueModal());
useKeyboardShortcut("/", () => focusSearch());
useKeyboardShortcut(["g", "h"], () => navigate("/"));
```

Features:

- Disable shortcuts when typing in input fields
- Exception: Esc and Cmd/Ctrl+Enter work in inputs
- Support key combinations (G then H)
- Prevent default browser behavior
- Debounce to prevent accidental triggers

F. KEYBOARD SHORTCUTS HELP MODAL

Triggered by:

- Press ? key
- Click "Keyboard Shortcuts" in user menu

Modal design:

- Glassmorphism card
- Organized by category
- Search shortcuts
- Printable view

Layout:
┌─────────────────────────────────────┐
│ Keyboard Shortcuts [×] │
│ │
│ [Search shortcuts...] │
│ │
│ Navigation │
│ C Create new issue │
│ / Search issues │
│ G then H Go to Home │
│ G then I Go to Issues │
│ │
│ Issue List │
│ ↑ ↓ Navigate │
│ J K Navigate (vim) │
│ Enter Open issue │
│ R Refresh │
│ F Filters │
│ │
│ Issue Detail │
│ E Edit │
│ M Comment │
│ A Attachment │
│ │
│ [Print] [Close] │
└─────────────────────────────────────┘

G. VISUAL HINTS

Show shortcuts in UI:

- Tooltips: "Create Issue (C)"
- Button labels: "Search /"
- Menu items: "Home (G→H)"

First-time user:

- Show tooltip on first visit: "Press ? to see keyboard shortcuts"
- Dismissible, don't show again

---

TESTING CHECKLIST:

Error Messages:
✅ Non-whitelisted user sees clear error message
✅ Email copy button works
✅ Jira auth error shows admin details
✅ Network error shows retry button
✅ Auto-retry works (one attempt)
✅ Form validation shows real-time errors
✅ Offline banner appears when disconnected
✅ Toast durations correct (3s, 5s, 10s, never)
✅ Admin error logs page shows all errors
✅ Error details copyable

Keyboard Shortcuts:
✅ C opens create modal
✅ / focuses search
✅ ? opens help modal
✅ Esc closes modals
✅ G→H navigates to home
✅ ↑↓ and J/K navigate issue list
✅ Enter opens selected issue
✅ R refreshes list
✅ Shortcuts disabled in input fields
✅ Cmd+Enter submits forms
✅ Help modal searchable
✅ Tooltips show shortcuts
✅ First-time tooltip appears

---

DELIVERABLES:

Frontend:

- Updated useAuth.tsx with whitelist error handling
- Error categorization utility (lib/errors.ts)
- Toast notification system enhancements
- Form validation improvements
- Admin error logs page (pages/ErrorLogs.tsx)
- Keyboard shortcut hook (hooks/useKeyboardShortcut.tsx)
- Shortcuts help modal (components/ShortcutsHelp.tsx)
- Visual hints in tooltips and buttons

Backend:

- Enhanced error responses with categorization
- Admin-only technical details in errors
- Error logging to activity_log

All components follow Relay branding (orange/red gradient, glassmorphism).

```

### MISSION 13: Advanced Features - Bulk Operations + Mobile Experience (6-8h review time)

```

Empower SQA and Admins with bulk actions and optimize the mobile experience for field use.

PROBLEM:

- Triaging large numbers of issues is slow (one-by-one)
- Table layout is hard to read on phones
- Filters are difficult to access on small screens
- Navigation doesn't feel native to mobile users

SOLUTION:
Implement bulk operation tools and a mobile-first responsive interface.

---

PART 1: BULK OPERATIONS (ADMIN + SQA ONLY)

A. SELECTION UI

- Add checkbox column to issue list (visible only to SQA and Admin)
- "Select All" checkbox in header
- Row highlight when selected
- Shift+Click supported for range selection

B. BULK ACTIONS BAR

- Floating action bar at bottom (glassmorphism style)
- Shows when 1+ issues selected
- Counter: "3 issues selected"
- Actions:
  - [Change Status ▼]
  - [Change Priority ▼]
  - [Assign To ▼]
  - [Bulk Delete] (Admin only)
- [Cancel] button to clear selection

C. BATCH NOTIFICATIONS

- When updating multiple issues, do NOT send individual emails
- Combine updates into one summary email per user:
  "Hi {name}, {count} of your issues were updated: [List of Issue Keys]"
- Integrated with SendGrid

D. CONSTRAINTS & PERFORMANCE

- Soft limit: 50 issues (warning if more)
- Hard limit: 100 issues (prevent selection)
- Processing: Batch updates (10 at a time) to prevent timeouts
- No "Undo" feature (as per tech spec)

E. CONFIRMATION & PROGRESS

- Strong confirmation dialog before applying
- Blocking progress modal during update:
  "Updating {count} issues... {current}/{total}"
- Finish state: Successful updates count + fail list (if any)
- Log all actions in activity_log

---

PART 2: MOBILE EXPERIENCE (RESPONSIVE WEB)

A. MOBILE CARD VIEW

- Transform table into stackable cards for screens < 768px
- Layout: [Type Icon] [Key] [Priority Label] | [Status Badge]
- Title on separate line
- Reporter and relative time (e.g., "2h ago") at bottom

B. BOTTOM TAB BAR NAVIGATION

- Sticky navigation at bottom of screen
- Icons: [Home] [Issues] [➕] [Profile]
- Center [➕] button is elevated/larger (Primary Action)

C. MOBILE FILTERS

- Top area: Horizontal scrollable "Filter Chips" for common views (My Issues, High Priority, Open)
- [+ More] chip opens a Bottom Sheet for full filter options
- Glassmorphism style for sheets

D. TOUCH GESTURES & ACTIONS

- Swipe Sensitivity: 30% (Balanced)
- Swipe Left on card: Quick actions (Comment, Status Change)
- Swipe Right on card: Mark Read/Unread
- Long Press on card: Toggle Selection (for bulk mode)
- Action buttons still available via "..." menu for accessibility

E. FORM OPTIMIZATION

- Full-screen mode for Create/Edit forms on mobile
- Large touch targets (min 48px)
- Use native date pickers and file selectors

---

TESTING CHECKLIST:

Bulk Operations:
✅ Checkboxes only visible to SQA/Admin
✅ Select All works correctly
✅ Selection bar shows correct count
✅ Bulk status change updates all issues in Jira
✅ Bulk delete (Admin only) works
✅ Confirmation dialog appears
✅ Progress modal blocks UX during update
✅ Activity logs created for each bulk action
✅ Success/Fail summary shows at end
✅ Batch email notification sent correctly

Mobile Experience:
✅ Layout switches to Card View on mobile
✅ Bottom Tab Bar is fixed/functional
✅ Center (+) button opens Create Form
✅ Filter Chips are scrollable
✅ Bottom Sheet opens for advanced filters
✅ Swipe gestures trigger correct actions
✅ Form fields are easy to tap
✅ Image attachments preview correctly on small screens

---

DELIVERABLES:

Frontend:

- Updated IssuesList.tsx with selection logic
- BulkActionsBar.tsx component
- BulkProgressModal.tsx component
- Mobile-specific components: BottomTabBar.tsx, MobileIssueCard.tsx, FilterBottomSheet.tsx
- Responsive CSS updates for all pages
- Gesture handler integration (react-use or similar)

Backend:

- POST /api/issues/bulk-update endpoint
- DELETE /api/issues/bulk-delete endpoint
- Bulk action helper in jira_service.py
- Batch notification logic in email_service.py

### MISSION 14: Reliability & UI Aesthetics (6-8h review time)

```

Fix pagination bugs, improve data freshness, and polish the issue list/detail UI for a premium, readable experience.

PROBLEM:
- Jira API sometimes returns "total: 0" causing hidden pagination even when issues exist.
- Non-standard statuses look plain and "ugly".
- Priority bars are confusing and not instantly understandable.
- Issue descriptions feel "crowded" and like a "wall of text" compared to Jira.
- Comments in Jira all show as "Tech Tools", losing track of who actually said what.

SOLUTION:
Implement robust total count detection, dynamic status badging, enhanced description typography, and prepended comment attribution.

---

PART 1: BACKEND ROBUSTNESS & ATTRIBUTION

Update backend/api/services/jira_service.py:
- Ensure fetch_issues() correctly extracts "total" from Jira response.
- Update add_comment() to prepend the Relay user's name: "**Name (Relay):** \n\n Comment text".
- Maintain strict "relay-app" filtering with better API compatibility.

Update backend/api/routes/issues.py:
- Support `refresh=true` param to force skip_cache=True.

---

PART 2: STATUS, PRIORITY & TYPOGRAPHY POLISH (FRONTEND)

Update frontend/src/components/issues/IssueList.tsx:
- StatusBadge: Dynamic color mapper + clean fallbacks for unknown statuses.
- PriorityIndicator: Clear Icons + Text Label design (e.g., 🔴 Highest).

Update frontend/src/pages/IssueDetail.tsx:
- Description Polish:
  - Increase line-height and paragraph spacing in ReactMarkdown.
  - Add specific styling for headers, lists, and bold text to match professional document structure.
  - Remove "wall of text" feel by adding room to breathe between sections.

---

PART 3: PAGINATION & REFRESH UX

Update frontend/src/components/issues/Pagination.tsx:
- Add "Items per page" selector: [20, 50, 100].
- Add "Jump to Page" input.
- Ensure controls are ALWAYS visible if total items > limit.

---

TESTING CHECKLIST:

Accuracy:
✅ Total count shows "1 to 20 of 500+" (correctly reflecting full Jira results).
✅ Comments in Jira show: "**John Doe (Relay):** My comment here".
✅ Refresh button updates the list immediately.

Aesthetics:
✅ "SQA INVESTIGATION" and other custom statuses look like styled badges.
✅ Priority is represented by clear icons + labels.
✅ Descriptions are highly readable with proper spacing and hierarchy.

---

DELIVERABLES:

Backend:
- Fixed `total` count logic in jira_service.py.
- Comment attribution logic in add_comment().

Frontend:
- Polished StatusBadge and PriorityIndicator in IssueList.tsx.
- Enhanced Typography and Spacing for descriptions in IssueDetail.tsx.
- Enhanced Pagination.tsx with limit selector and jump-to-page.
- Refresh button with sync feedback.

```

---

## 📋 MISSION SUMMARY

1. ✅ Project Foundation (3-4h)
2. ✅ Supabase + Google SSO (4-5h)
3. ✅ Jira API Integration (5-6h)
4. ✅ Issue List + Filters (5-6h)
5. ✅ Issue Detail View (4-5h)
6. ✅ Create Issue Form (4-5h)
7. ✅ Notifications (5-6h)
8. ✅ Dashboard (3-4h)
9. ✅ Polling System (3-4h)
10. ✅ Deployment (4-5h)
11. ✅ Email Whitelist + README Updates (5-6h)
12. 🔄 UX - Errors + Shortcuts (6-8h)
13. 🔄 Advanced - Bulk + Mobile (6-8h)
14. 🔄 Reliability - UI Polish + Pagination Fix (5-6h)

**Total: 60-80 hours of review/testing time**

---

## 🚀 HOW TO START

1. Copy MISSION 1 → Paste into Google Antigravity
2. Add your specific details (company name, Jira domain, etc.)
3. Let the agent work
4. Review artifacts when ready
5. Test locally
6. Provide feedback
7. Once approved → Move to MISSION 2
8. Repeat for all 14 missions

---

## 📝 SETUP REQUIREMENTS

Before starting, prepare:

1. ✅ Jira Cloud admin access
2. ✅ Jira API token
3. ✅ Jira project key
4. ✅ Turso account (free tier)
5. ✅ SendGrid account (free tier)
6. ✅ Discord webhooks (3 channels created)
7. ✅ Google Cloud Console (for OAuth)
8. ✅ Vercel account (free tier)

---

## 📖 ADDITIONAL NOTES

### Why This Architecture?

- **Pure passthrough (Option A)**: Simplest approach, no data sync issues
- **Turso for preferences only**: Keeps user settings and whitelist without complicating data flow
- **Polling vs Webhooks**: Polling is already implemented, webhooks can be added in Phase 2
- **Email whitelist**: Private access control without complex user management

### Estimated Timeline

- **Week 1-2**: Missions 1-10 (Core Features)
- **Week 3**: Missions 11-12 (Security + UX)
- **Week 4**: Missions 13-14 (Advanced Power Features)
- **Total**: ~4 weeks with AI assistance

### Success Metrics

- ✅ 80 users can submit bugs/tasks
- ✅ All data syncs to Jira Cloud
- ✅ Notifications working (email + Discord)
- ✅ Users prefer it over JSM
- ✅ $0/month hosting cost

---

**END OF SPECIFICATION - Ready to build Relay! 🚀**

```

```
