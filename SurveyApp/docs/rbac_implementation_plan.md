# Role-Based Access Control (RBAC) Implementation Plan

## Overview

Implement granular access control for InsightPulse with three roles: **Admin**, **Viewer/Stakeholder**, and **Facilitator**.

---

## Role Permissions Matrix

| Feature               | Admin  | Viewer | Facilitator       |
| --------------------- | ------ | ------ | ----------------- |
| View all sessions     | ✅     | ✅     | ❌ (own only)     |
| View own sessions     | ✅     | ✅     | ✅                |
| Import sessions       | ✅     | ❌     | ❌                |
| Run analysis          | ✅     | ❌     | ✅ (own only)     |
| Create action items   | ✅     | ❌     | ✅ (own sessions) |
| Edit action items     | ✅     | ❌     | ✅ (own sessions) |
| Assign to any user    | ✅     | ❌     | ✅                |
| View assigned items   | ✅     | ✅     | ✅                |
| Export reports        | ✅     | ✅     | ✅ (own only)     |
| Manage users          | ✅     | ❌     | ❌                |
| System settings       | ✅     | ❌     | ❌                |
| Receive notifications | ✅     | ❌     | ✅                |
| Dashboard scope       | Global | Global | Personal          |

---

## Key Implementation Details

### 1. User Management

- **New users**: Default role is `viewer`
- **Name field**: Auto-populated from Google OAuth profile
- **Role changes**: Admin-only

### 2. Session Ownership

- Match by `facilitator_name` == `User.name` (text comparison)
- Admins can manually edit `facilitator_name` to reassign
- No schema change needed (keep text-based matching)

### 3. Action Items - Two Views for Facilitators

**Section A: "My Sessions' Action Items"**

- All action items from sessions where user is facilitator

**Section B: "Assigned to Me"**

- Action items from OTHER sessions where `person_in_charge` matches user
- Shows: Issue, Action, Priority, Deadline, Status, Notes, Session Name, Date
- Does NOT show: Full session details, analyses, common issues
- Cannot navigate to the full session

### 4. Dashboard Stats (Facilitator)

- Total sessions: Only their own
- Total responses: From their sessions
- Pending action items: Both types (own sessions + assigned to them)
- Ratings: Their sessions only

### 5. Access Denied Behavior

- Return `403 Forbidden - No access to this session`
- Log access attempts for security audit

---

## Proposed Changes

### Backend Changes

#### [MODIFY] [auth_service.py](file:///Users/romand/Documents/GitHub/SurveyApp/backend/services/auth_service.py)

- Add `require_session_access(session_id)` decorator
- Add `can_access_session(user, session)` helper function
- Add `get_accessible_sessions(user)` filter function

#### [MODIFY] [sessions.py](file:///Users/romand/Documents/GitHub/SurveyApp/backend/api/sessions.py)

- Filter sessions list by facilitator name for facilitator role
- Add access check on session detail endpoint
- Restrict import to admin only
- Restrict analysis to session owner or admin

#### [MODIFY] [action_items.py](file:///Users/romand/Documents/GitHub/SurveyApp/backend/api/action_items.py)

- Add new endpoint: `GET /api/action-items/assigned` (items assigned to current user from other sessions)
- Filter action items by session ownership OR assignment
- Restrict create/edit to session owner or admin

#### [MODIFY] [users.py](file:///Users/romand/Documents/GitHub/SurveyApp/backend/api/users.py)

- Add `GET /api/users/list` for action item assignment dropdown
- Restrict user management to admin

#### [MODIFY] [dashboard.py](file:///Users/romand/Documents/GitHub/SurveyApp/backend/api/dashboard.py)

- Apply role-based filtering to all stats queries

---

### Frontend Changes

#### [MODIFY] [ActionItemsPage.tsx](file:///Users/romand/Documents/GitHub/SurveyApp/frontend/src/pages/ActionItemsPage.tsx)

- Split into two sections for facilitators
- Show "My Sessions" vs "Assigned to Me" tabs

#### [MODIFY] [SessionsPage.tsx](file:///Users/romand/Documents/GitHub/SurveyApp/frontend/src/pages/SessionsPage.tsx)

- Hide import button for non-admins
- Filter list client-side as backup

#### [MODIFY] [Dashboard.tsx](file:///Users/romand/Documents/GitHub/SurveyApp/frontend/src/pages/Dashboard.tsx)

- Display appropriate stats based on role
- Show "Your Stats" vs "Global Stats" label

#### [MODIFY] Various components

- Hide edit/delete buttons for viewers
- Disable forms for read-only users

---

## Verification Plan

### Manual Tests

1. Login as admin → see all sessions, can import
2. Login as viewer → see all sessions, cannot edit anything
3. Login as facilitator → see only own sessions
4. Facilitator A assigns item to Facilitator B → B sees in "Assigned to Me"
5. Facilitator tries direct URL to other session → 403 error

### Automated Tests

- Add pytest tests for each role's access patterns
- Test permission decorators

---

## Estimated Time

- Backend access control: 3-4 hours
- Frontend role-based UI: 2-3 hours
- Testing: 1-2 hours
- **Total: ~6-9 hours**
