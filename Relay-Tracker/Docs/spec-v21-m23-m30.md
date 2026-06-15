# MISSIONS 23-30: Polish, Extended Features & Future Enhancements

**Phase**: v2.1+  
**Priority**: Lower Impact / Nice-to-Have  
**Dependencies**: GA v2 stable (Missions 17-22 complete)

---

## EXECUTIVE SUMMARY

This phase delivers incremental improvements and extended features that enhance the user experience without fundamentally changing core workflows:

| Mission | Feature                       | Theme                |
| :------ | :---------------------------- | :------------------- |
| **23**  | Kanban Board View             | Visual Workflow      |
| **24**  | Issue Linking & Dependencies  | Relationship Mapping |
| **25**  | PWA & Mobile Optimization     | Accessibility        |
| **26**  | Time Tracking Integration     | Productivity         |
| **27**  | Issue Templates Library       | Efficiency           |
| **28**  | Comment Reactions             | Quick Feedback       |
| **29**  | Custom Keyboard Shortcuts     | Power Users          |
| **30**  | Multi-Language Support (i18n) | Internationalization |

These missions can be implemented in any order based on user demand.

---

# MISSION 23: Kanban Board View

## OBJECTIVE

Provide a visual, drag-and-drop board interface as an alternative to the list view.

## REQUIREMENTS

### Functional

- Display issues as cards organized by status columns (e.g., To Do → In Progress → QA → Done)
- Columns configurable by admin (can hide/show specific statuses)
- Cards show: Issue key, summary, priority icon, reporter avatar
- Drag card between columns to update status (if user has permission)
- Swim lanes option: Group by Priority, Type, or Assignee
- WIP (Work-In-Progress) limits per column (configurable, soft warning)

### Technical

| Component   | Details                                       |
| :---------- | :-------------------------------------------- |
| Library     | `@dnd-kit/core` or `react-beautiful-dnd`      |
| State       | Optimistic UI update; rollback on API failure |
| Performance | Virtualize columns with > 50 cards            |

### New Files

```
frontend/src/pages/Board.tsx
frontend/src/components/board/BoardColumn.tsx
frontend/src/components/board/BoardCard.tsx
frontend/src/components/board/SwimLaneSelector.tsx
```

### API Impact

- Reuses existing `/api/issues` and `/api/issues/:key/status` endpoints
- No new backend routes required

### Testing Checklist

- [ ] Board view loads with issues in correct columns
- [ ] Dragging card updates status via API
- [ ] Rollback if API call fails
- [ ] Swim lanes correctly group issues
- [ ] WIP limit warning appears when exceeded

---

# MISSION 24: Issue Linking & Dependencies

## OBJECTIVE

Allow users to establish relationships between issues (blocks, is blocked by, relates to).

## REQUIREMENTS

### Functional

- Link types:
  - **Blocks** / **Is Blocked By** (directional)
  - **Relates To** (bidirectional)
  - **Duplicates** / **Is Duplicated By** (directional)
- Create link from issue detail sidebar
- Linked issues displayed as clickable list with link type label
- When viewing a blocked issue, show warning banner: "⚠️ Blocked by FS-1234"

### Technical

#### New Database Table

```sql
CREATE TABLE issue_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_issue TEXT NOT NULL,
    target_issue TEXT NOT NULL,
    link_type TEXT NOT NULL,  -- 'blocks', 'relates_to', 'duplicates'
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_issue, target_issue, link_type)
);
```

#### New API Endpoints

| Endpoint                     | Method | Purpose                 |
| :--------------------------- | :----- | :---------------------- |
| `/api/issues/:key/links`     | GET    | List links for an issue |
| `/api/issues/:key/links`     | POST   | Create a new link       |
| `/api/issues/:key/links/:id` | DELETE | Remove a link           |

### New Files

```
frontend/src/components/issues/IssueLinks.tsx
frontend/src/components/issues/LinkIssueModal.tsx
backend/api/routes/links.py
```

### Testing Checklist

- [ ] Can create a "blocks" link between two issues
- [ ] Link appears on both issues (inverse direction)
- [ ] Blocked issue shows warning banner
- [ ] Link can be deleted
- [ ] Duplicate link type available (integrates with M20)

---

# MISSION 25: PWA & Mobile Optimization

## OBJECTIVE

Transform Relay into a Progressive Web App with offline capabilities and improved mobile UX.

## REQUIREMENTS

### PWA Features

- Service Worker for caching static assets
- Manifest.json for "Add to Home Screen"
- Offline fallback page: "You're offline. Cached issues available."
- Cache recent issues for offline viewing (last 50 viewed)
- Background sync: Queue actions taken offline, sync on reconnect

### Mobile UX

- Responsive nav: Hamburger menu on mobile
- Touch-friendly: Larger tap targets (min 44px)
- Swipe gestures: Swipe left/right on issue card for quick actions
- Pull-to-refresh on issue list

### Technical

#### New Files

```
frontend/public/manifest.json
frontend/public/sw.js  (Service Worker)
frontend/src/hooks/useOffline.ts
frontend/src/components/OfflineBanner.tsx
```

#### Dependencies

```
workbox-webpack-plugin@7.x  # For service worker generation
```

### Testing Checklist

- [ ] Manifest allows "Add to Home Screen" on mobile
- [ ] App works offline (shows cached data)
- [ ] Actions queued offline sync when online
- [ ] Pull-to-refresh works on mobile
- [ ] Lighthouse PWA score > 90

---

# MISSION 26: Time Tracking Integration

## OBJECTIVE

Allow users to log time spent on issues directly within Relay.

## REQUIREMENTS

### Functional

- "Log Time" button on issue detail page
- Time entry form: Duration (hours:minutes), Date, Description
- Time log history shown on issue (table format)
- Weekly summary view: Total time by issue/project
- Optional: Integrate with external tools (Clockify, Toggl) via API

### Technical

#### New Database Table

```sql
CREATE TABLE time_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    log_date DATE NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### New API Endpoints

| Endpoint                         | Method | Purpose                     |
| :------------------------------- | :----- | :-------------------------- |
| `/api/issues/:key/time-logs`     | GET    | List time entries for issue |
| `/api/issues/:key/time-logs`     | POST   | Create time entry           |
| `/api/issues/:key/time-logs/:id` | DELETE | Delete time entry           |
| `/api/time-logs/summary`         | GET    | Weekly/monthly summary      |

### New Files

```
frontend/src/components/issues/TimeLogForm.tsx
frontend/src/components/issues/TimeLogHistory.tsx
frontend/src/pages/TimeSummary.tsx
backend/api/routes/time_logs.py
```

### Testing Checklist

- [ ] Can log time on an issue
- [ ] Time history displays correctly
- [ ] Weekly summary shows accurate totals
- [ ] Time entry can be deleted
- [ ] Duration validation works (no negative values)

---

# MISSION 27: Issue Templates Library

## OBJECTIVE

Provide pre-filled issue templates for common scenarios to speed up reporting.

## REQUIREMENTS

### Functional

- Template dropdown in Create Issue modal
- Templates by type: Bug Templates, Task Templates, Story Templates
- Template contains: Pre-filled summary prefix, description boilerplate, default priority
- Admin can create/edit/delete templates
- Users can create personal templates

### Example Templates

| Template Name   | Type  | Pre-filled Content                                                |
| :-------------- | :---- | :---------------------------------------------------------------- |
| Login Bug       | Bug   | Summary: "[Login] ", Description: "Steps: 1. Go to login page..." |
| Payment Issue   | Bug   | Summary: "[Payment] ", Priority: Highest                          |
| Feature Request | Story | Description: "As a user, I want..."                               |
| Tech Debt       | Task  | Labels: ["tech-debt"], Priority: Low                              |

### Technical

#### New Database Table

```sql
CREATE TABLE issue_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  issue_type TEXT NOT NULL,  -- 'bug', 'task', 'story'
  summary_prefix TEXT,
  description_template TEXT,
  default_priority TEXT,
  default_labels TEXT,  -- JSON array
  user_id TEXT,  -- NULL = team template
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Testing Checklist

- [ ] Template dropdown appears in Create modal
- [ ] Selecting template pre-fills fields
- [ ] Admin can create team templates
- [ ] User can create personal templates
- [ ] Template can be edited/deleted

---

# MISSION 28: Comment Reactions

## OBJECTIVE

Allow quick emoji reactions on comments without writing full replies.

## REQUIREMENTS

### Functional

- Reaction button (😊) appears on each comment
- Reaction picker: 👍 👎 ❤️ 🎉 👀 🤔
- Reactions display below comment with count (👍 3, ❤️ 1)
- Click existing reaction to add/remove your reaction
- Hover shows who reacted

### Technical

#### New Database Table

```sql
CREATE TABLE comment_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id, emoji)
);
```

#### API Changes

- Modify `/api/issues/:key/comments` response to include reactions
- New: `POST /api/comments/:id/reactions` - Add reaction
- New: `DELETE /api/comments/:id/reactions/:emoji` - Remove reaction

### Testing Checklist

- [ ] Reaction picker appears on hover
- [ ] Can add a reaction
- [ ] Reaction count updates
- [ ] Can remove reaction by clicking again
- [ ] Tooltip shows reactor names

---

# MISSION 29: Custom Keyboard Shortcuts

## OBJECTIVE

Allow power users to customize keyboard shortcuts for common actions.

## REQUIREMENTS

### Functional

- Settings page section for keyboard shortcuts
- Default shortcuts displayed with current bindings
- Click to record new shortcut (captures key combo)
- Conflict detection: Warn if shortcut already in use
- Reset to defaults button

### Default Shortcuts

| Action               | Default     | Customizable |
| :------------------- | :---------- | :----------- |
| Open Command Palette | Cmd+K       | Yes          |
| Create Issue         | Cmd+N       | Yes          |
| Previous Issue       | K           | Yes          |
| Next Issue           | J           | Yes          |
| Toggle Theme         | Cmd+Shift+L | Yes          |
| Focus Search         | /           | Yes          |

### Technical

#### Database

Store in `user_preferences` as JSON column:

```sql
ALTER TABLE user_preferences ADD COLUMN keyboard_shortcuts TEXT;
-- Default: NULL (use defaults), else JSON map
```

### New Files

```
frontend/src/components/settings/ShortcutEditor.tsx
frontend/src/hooks/useKeyboardShortcuts.ts  (refactor from current)
```

### Testing Checklist

- [ ] Shortcut settings page renders
- [ ] Can record a new shortcut
- [ ] Conflict warning appears if duplicate
- [ ] Custom shortcut works globally
- [ ] Reset to defaults works

---

# MISSION 30: Multi-Language Support (i18n)

## OBJECTIVE

Internationalize Relay to support multiple languages.

## REQUIREMENTS

### Functional

- Language selector in user settings
- Initial languages: English (default), Spanish, Chinese (Simplified)
- All UI strings loaded from translation files
- Date/time formats adapt to locale
- Number formats adapt to locale

### Technical

#### Dependencies

```
react-i18next@13.x
i18next@23.x
```

#### Translation Files Structure

```
frontend/src/locales/
├── en/
│   ├── common.json
│   ├── issues.json
│   └── settings.json
├── es/
│   └── ... (same structure)
└── zh/
    └── ... (same structure)
```

#### Implementation

- Use `useTranslation()` hook in components
- Replace hardcoded strings with `t('key')` calls
- Date formatting via `Intl.DateTimeFormat`
- Store language preference in `user_preferences.language`

### Testing Checklist

- [ ] Language selector appears in settings
- [ ] Switching language updates all UI text
- [ ] Date formats adapt to locale
- [ ] Fallback to English for missing translations
- [ ] RTL support for future Arabic/Hebrew (stretch)

---

## IMPLEMENTATION PRIORITY GUIDE

For teams deciding which v2.1+ mission to tackle first:

| If you need...                   | Start with Mission |
| :------------------------------- | :----------------- |
| Visual sprint management         | **23** (Kanban)    |
| Complex bug dependency tracking  | **24** (Linking)   |
| Mobile workforce support         | **25** (PWA)       |
| Billing/contractor time tracking | **26** (Time)      |
| Onboarding new reporters quickly | **27** (Templates) |
| Reduce comment noise             | **28** (Reactions) |
| Power user retention             | **29** (Shortcuts) |
| International team expansion     | **30** (i18n)      |

---

## GENERAL TESTING APPROACH

For all missions in this phase:

1. Feature flag each mission independently
2. Deploy to staging first with internal dogfooding
3. Gather user feedback before production rollout
4. Monitor performance impact (especially M23 Kanban, M25 PWA)

---

## OUT OF SCOPE FOR ALL MISSIONS

- Native mobile apps (iOS/Android)
- White-labeling or multi-tenant architecture
- Jira Server/Data Center support (Cloud only)
- Enterprise SSO (SAML/Okta) beyond Google OAuth
