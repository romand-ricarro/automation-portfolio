# Mission Charlie: Insights & Automation

## Overview

**Codename**: Charlie | **Phase**: Production Phase 2 | **Duration**: ~2 weeks  
**Prerequisites**: Mission Alpha + Bravo complete

This mission makes InsightPulse smarter and more autonomous through customizable AI prompts and email notifications.

---

## Task 1: Customizable AI Prompts

### Problem

- AI prompts hardcoded in `openai_service.py`
- Changing behavior requires code deployment
- No A/B testing of prompt strategies

### Database Models

**PromptTemplate**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | String(100) | Display name |
| slug | String(50) | Unique identifier (e.g., "question_analysis") |
| template_content | Text | The prompt template |
| version | Integer | Current version number |
| is_active | Boolean | Whether template is in use |
| created_by | UUID FK | Creator user ID |

**PromptTemplateVersion** - Stores version history for rollback

### API Endpoints

| Endpoint                               | Method  | Role  | Description              |
| -------------------------------------- | ------- | ----- | ------------------------ |
| `/api/prompts`                         | GET     | Admin | List all templates       |
| `/api/prompts/<slug>`                  | GET/PUT | Admin | Get/update template      |
| `/api/prompts/<slug>/preview`          | POST    | Admin | Preview with sample data |
| `/api/prompts/<slug>/revert/<version>` | POST    | Admin | Revert to version        |

### Template Variables

```
{{question_name}} - Question being analyzed
{{responses}} - JSON array of responses
{{response_count}} - Number of responses
{{session_context}} - Session metadata
```

### Frontend

- Admin page at `/admin/prompts`
- Code editor with syntax highlighting for `{{variables}}`
- Live preview panel
- Version history with revert capability

### Files to Create/Modify

- `backend/models/database.py` - Add models
- `backend/api/prompts.py` - New blueprint
- `backend/services/prompt_service.py` - Template rendering
- `backend/services/openai_service.py` - Load from DB
- `frontend/src/pages/admin/PromptsPage.tsx`
- `frontend/src/components/admin/PromptEditor.tsx`

---

## Task 2: Email Notifications

### Problem

- Users must manually check app for updates
- No alerts for action item assignments
- No reminders for overdue items

### Notification Types

| Type                 | Trigger               | Recipient                |
| -------------------- | --------------------- | ------------------------ |
| Analysis Complete    | Session analysis done | Facilitator              |
| Action Item Assigned | Item created/assigned | Assignee                 |
| Action Item Reminder | Daily check           | Users with overdue items |
| Weekly Digest        | Weekly cron           | Admins/Facilitators      |

### Database Model

**NotificationPreference**
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID FK | User reference |
| analysis_complete | Boolean | Enable this notification |
| action_item_assigned | Boolean | Enable this notification |
| weekly_digest | Boolean | Enable this notification |
| email_override | String | Optional different email |

### Implementation

- Use **Resend** email API (`resend>=0.7.0`)
- HTML email templates in `backend/templates/emails/`
- Trigger from existing endpoints on success
- Cron endpoint for scheduled notifications

### Frontend

- Settings page at `/settings/notifications`
- Toggle switches for each notification type
- Test email button

### Files to Create/Modify

- `backend/services/email_service.py` - Email sending
- `backend/api/notifications.py` - Preferences CRUD
- `backend/templates/emails/*.html` - Email templates
- `frontend/src/pages/settings/NotificationsPage.tsx`

---

## Task 3: Frontend Unit Tests

### Setup

- Vitest + React Testing Library + MSW
- Configure in `vitest.config.ts`
- Setup file at `src/test/setup.ts`

### Coverage Targets

| Component       | Priority | Key Tests                     |
| --------------- | -------- | ----------------------------- |
| Login           | High     | Form render, submit, errors   |
| SessionList     | High     | Render, filter, navigate      |
| SessionDetail   | High     | Display data, analyze, export |
| ActionItemsList | High     | CRUD operations               |
| AuthContext     | High     | Login/logout flow             |

### Dependencies to Add

```json
"@testing-library/react": "^14.0.0",
"@testing-library/jest-dom": "^6.0.0",
"@testing-library/user-event": "^14.0.0",
"msw": "^2.0.0"
```

### Files to Create

- `frontend/src/test/setup.ts`
- `frontend/src/test/mocks/handlers.ts`
- `frontend/src/components/**/__tests__/*.test.tsx`

---

## Environment Variables

| Variable         | Location | Description              |
| ---------------- | -------- | ------------------------ |
| `RESEND_API_KEY` | Backend  | Resend email API key     |
| `FROM_EMAIL`     | Backend  | Sender email address     |
| `APP_URL`        | Backend  | Base URL for email links |

## Acceptance Criteria

- [ ] Admin can edit prompts via UI
- [ ] Prompt changes create version history
- [ ] Analysis complete emails sent to facilitators
- [ ] Users can toggle notification preferences
- [ ] Frontend test coverage >80% on components
- [ ] All tests pass without network requests
