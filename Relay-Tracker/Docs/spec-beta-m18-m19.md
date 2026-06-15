# MISSIONS 18-19: Team Communication & Analytics

**Phase**: Beta  
**Priority**: 🥈🥉 High Impact  
**Dependencies**: Mission 17 (WebSockets) recommended but not required

---

## EXECUTIVE SUMMARY

This phase delivers two complementary features:

1. **Mission 18**: Slack/Discord integration for team notifications
2. **Mission 19**: Analytics dashboard for managers and team leads

Together, these features increase Relay's visibility across the organization and provide actionable insights.

---

# MISSION 18: Slack/Discord Integration

## PROBLEM STATEMENT

### Current State

- Issue updates are only visible within the Relay app
- Team members miss critical updates if they're not actively using Relay
- No way to quickly notify a channel when an urgent bug is reported

### User Pain Points

1. **Developers**: Miss assignment notifications while focused in their IDE
2. **SQA Leads**: Can't broadcast urgent issues to the team instantly
3. **Managers**: No visibility into issue activity without logging into Relay

---

## SOLUTION OVERVIEW

Build an outgoing webhook integration that posts formatted messages to Slack or Discord channels when specific events occur in Relay.

### Supported Events

| Event                          | Default Behavior           | Configurable               |
| :----------------------------- | :------------------------- | :------------------------- |
| Issue Created                  | Post to configured channel | Channel, enabled/disabled  |
| Issue Status Changed to "Done" | Post to configured channel | Channel, enabled/disabled  |
| High Priority Issue Created    | Post with @channel mention | Mention behavior           |
| Comment Added                  | Do not post (too noisy)    | Can be enabled per channel |

---

## FUNCTIONAL REQUIREMENTS

### FR-1: Workspace Configuration (Admin)

- **FR-1.1**: Admin can add Slack workspace via OAuth flow (Slack App)
- **FR-1.2**: Admin can add Discord server via webhook URL
- **FR-1.3**: Admin can configure which channel receives which events
- **FR-1.4**: Admin can enable/disable the integration without deleting config

### FR-2: Message Formatting

- **FR-2.1**: Messages use rich formatting (Slack Block Kit / Discord Embeds)
- **FR-2.2**: Messages include: Issue key, summary, priority, reporter, and direct link to Relay
- **FR-2.3**: Priority is visually indicated (🔴 Highest, 🟠 High, 🟡 Medium, 🔵 Low)
- **FR-2.4**: Messages are branded with Relay logo/icon

### FR-3: User Mentions (Optional)

- **FR-3.1**: If a Relay user's email matches a Slack/Discord user, @mention them on assignment
- **FR-3.2**: User can opt-out of mentions in their preferences

---

## TECHNICAL SPECIFICATIONS

### Backend

#### New Database Table

```sql
CREATE TABLE integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'slack' or 'discord'
    workspace_id TEXT,  -- Slack workspace ID or NULL for Discord
    webhook_url TEXT NOT NULL,
    channel_name TEXT,
    events TEXT NOT NULL, -- JSON array: ["issue.created", "issue.done"]
    enabled INTEGER DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### New Files

| File                                              | Purpose                                  |
| :------------------------------------------------ | :--------------------------------------- |
| `backend/api/routes/integrations.py`              | CRUD endpoints for integration config    |
| `backend/api/services/slack_service.py`           | Slack message formatting and sending     |
| `backend/api/services/discord_service.py`         | Discord message formatting and sending   |
| `backend/api/services/notification_dispatcher.py` | Routes events to configured integrations |

#### Modified Files

| File                           | Changes                                                   |
| :----------------------------- | :-------------------------------------------------------- |
| `backend/api/routes/issues.py` | Call `notification_dispatcher.emit()` after issue actions |
| `backend/api/index.py`         | Register `integrations_bp` blueprint                      |

### Frontend

#### New Files

| File                                                   | Purpose                              |
| :----------------------------------------------------- | :----------------------------------- |
| `frontend/src/pages/admin/Integrations.tsx`            | Admin page for managing integrations |
| `frontend/src/components/admin/SlackConnector.tsx`     | Slack OAuth flow component           |
| `frontend/src/components/admin/DiscordWebhookForm.tsx` | Discord webhook URL input form       |

#### Modified Files

| File                                 | Changes                            |
| :----------------------------------- | :--------------------------------- |
| `frontend/src/components/Navbar.tsx` | Add "Integrations" link for admins |

---

## MESSAGE TEMPLATES

### Slack Block Kit Example

```json
{
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🐛 New Bug Reported" }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Issue:*\n<https://relay.app/issues/FS-1234|FS-1234>"
        },
        { "type": "mrkdwn", "text": "*Priority:*\n🔴 Highest" }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Summary:*\nLogin button not working on iOS Safari"
      }
    },
    {
      "type": "context",
      "elements": [
        { "type": "mrkdwn", "text": "Reported by *Jane Smith* via Relay" }
      ]
    }
  ]
}
```

### Discord Embed Example

```json
{
  "embeds": [
    {
      "title": "🐛 FS-1234: Login button not working on iOS Safari",
      "url": "https://relay.app/issues/FS-1234",
      "color": 15158332,
      "fields": [
        { "name": "Priority", "value": "🔴 Highest", "inline": true },
        { "name": "Reporter", "value": "Jane Smith", "inline": true }
      ],
      "footer": { "text": "Relay • Bug Tracker" }
    }
  ]
}
```

---

## TESTING CHECKLIST (Mission 18)

- [ ] Admin can add a Slack integration via OAuth
- [ ] Admin can add a Discord integration via webhook URL
- [ ] Creating an issue posts a message to the configured channel
- [ ] High-priority issues include @channel mention (if configured)
- [ ] Disabling the integration stops messages without deleting config
- [ ] Message includes clickable link back to Relay

---

# MISSION 19: Analytics Dashboard

## PROBLEM STATEMENT

### Current State

- No visibility into issue trends, resolution times, or team performance
- Managers must manually count issues in Jira to generate reports
- No way to identify bottlenecks in the bug lifecycle

### User Pain Points

1. **Managers**: Can't justify team resource allocation without data
2. **SQA Leads**: Don't know which issue types are most common
3. **Developers**: No feedback loop on how quickly they resolve bugs

---

## SOLUTION OVERVIEW

Build a dedicated Analytics page with interactive charts showing key performance indicators (KPIs) for issue management.

---

## FUNCTIONAL REQUIREMENTS

### FR-1: Dashboard Metrics

The dashboard must display the following metrics:

| Metric                      | Visualization      | Description                              |
| :-------------------------- | :----------------- | :--------------------------------------- |
| **Issues Created (Weekly)** | Line chart         | Trend of new issues over past 8 weeks    |
| **Issues by Status**        | Donut chart        | Current distribution across all statuses |
| **Issues by Priority**      | Horizontal bar     | Count of open issues per priority level  |
| **Average Resolution Time** | Big number + trend | Days from creation to "Done" status      |
| **Top Reporters**           | Leaderboard        | Users who reported the most issues       |
| **Issues by Type**          | Pie chart          | Bug vs Task vs Story distribution        |

### FR-2: Filtering

- **FR-2.1**: Date range picker (Last 7 days, 30 days, 90 days, Custom)
- **FR-2.2**: Filter by issue type (Bug, Task, Story)
- **FR-2.3**: Filter by reporter (for personal analytics)

### FR-3: Access Control

- **FR-3.1**: Full dashboard visible to `admin` and `sqa` roles
- **FR-3.2**: Regular users see only their personal statistics
- **FR-3.3**: "My Stats" card always visible to all users

---

## TECHNICAL SPECIFICATIONS

### Backend

#### New API Endpoints

| Endpoint                            | Method | Response                             |
| :---------------------------------- | :----- | :----------------------------------- |
| `/api/analytics/issues-over-time`   | GET    | `{ labels: [...], data: [...] }`     |
| `/api/analytics/issues-by-status`   | GET    | `{ labels: [...], data: [...] }`     |
| `/api/analytics/issues-by-priority` | GET    | `{ labels: [...], data: [...] }`     |
| `/api/analytics/resolution-time`    | GET    | `{ average: number, trend: number }` |
| `/api/analytics/top-reporters`      | GET    | `[{ name, count, avatar }, ...]`     |
| `/api/analytics/summary`            | GET    | Combined summary for initial load    |

All endpoints accept query params: `?start_date=&end_date=&type=&reporter=`

#### New Files

| File                                        | Purpose                 |
| :------------------------------------------ | :---------------------- |
| `backend/api/routes/analytics.py`           | Analytics API endpoints |
| `backend/api/services/analytics_service.py` | Data aggregation logic  |

#### Data Source

- Primary: Jira API (issue search with JQL)
- Secondary: Local `activity_log` table for Relay-specific metrics
- Caching: Results cached for 15 minutes per query

### Frontend

#### New Dependencies

```
recharts@2.10.3  # Lightweight charting library
```

#### New Files

| File                                                       | Purpose                       |
| :--------------------------------------------------------- | :---------------------------- |
| `frontend/src/pages/Analytics.tsx`                         | Main analytics dashboard page |
| `frontend/src/components/analytics/IssuesTrendChart.tsx`   | Line chart component          |
| `frontend/src/components/analytics/StatusDonut.tsx`        | Donut chart component         |
| `frontend/src/components/analytics/PriorityBars.tsx`       | Horizontal bar chart          |
| `frontend/src/components/analytics/ResolutionTimeCard.tsx` | Big number display            |
| `frontend/src/components/analytics/TopReportersCard.tsx`   | Leaderboard component         |
| `frontend/src/components/analytics/DateRangePicker.tsx`    | Filter component              |

#### Modified Files

| File                                 | Changes                |
| :----------------------------------- | :--------------------- |
| `frontend/src/components/Navbar.tsx` | Add "Analytics" link   |
| `frontend/src/App.tsx`               | Add `/analytics` route |

---

## UI WIREFRAME

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  📊 Analytics                                    [Last 30 Days ▾] [Type ▾]  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  Issues Created (Weekly)        │  │  Resolution Time                │   │
│  │  ▪▪▪                            │  │                                 │   │
│  │     ▪▪▪▪▪▪                      │  │          4.2 days               │   │
│  │         ▪▪▪▪▪▪▪▪                │  │          ↓ 12% vs last period   │   │
│  │  ───────────────────            │  │                                 │   │
│  │  W1  W2  W3  W4  W5  W6  W7 W8  │  │                                 │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  Issues by Status               │  │  Issues by Priority             │   │
│  │      ┌───┐                      │  │                                 │   │
│  │    ╱     ╲   🟢 Done: 45        │  │  🔴 Highest  ████████ 12        │   │
│  │   │       │  🔵 In Progress: 23 │  │  🟠 High     ██████ 8           │   │
│  │    ╲     ╱   🟡 QA: 15          │  │  🟡 Medium   ████████████ 18    │   │
│  │      └───┘   🟣 To Do: 28       │  │  🔵 Low      ████ 5             │   │
│  └─────────────────────────────────┘  └─────────────────────────────────┘   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  Top Reporters                                                          │ │
│  │  1. 👤 Jane Smith ............................................. 24    │ │
│  │  2. 👤 John Doe ................................................ 18    │ │
│  │  3. 👤 Alex Wong ............................................... 12    │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## TESTING CHECKLIST (Mission 19)

- [ ] Analytics page loads without error
- [ ] Charts render with correct data
- [ ] Date range filter updates all charts
- [ ] Type filter correctly excludes other types
- [ ] Resolution time shows correct average
- [ ] Top Reporters list is accurate
- [ ] Non-admin users see limited view
- [ ] Empty state displays gracefully when no data

---

## SECURITY CONSIDERATIONS

### Mission 18

- Slack OAuth tokens and Discord webhook URLs must be encrypted at rest
- Webhook URLs should be validated before saving
- Rate limit outgoing messages (max 1 per second per integration)

### Mission 19

- Analytics endpoints must enforce role-based access control
- Rate limit to prevent abuse (max 10 requests per minute)
- Sanitize JQL queries to prevent injection

---

## SUCCESS METRICS

| Metric                                          | Target           |
| :---------------------------------------------- | :--------------- |
| Slack/Discord adoption (teams with integration) | > 50%            |
| Analytics page views per week                   | > 100            |
| Manager satisfaction score                      | +15% improvement |
| Time spent generating reports manually          | -60% reduction   |

---

## OUT OF SCOPE FOR THIS PHASE

- Bidirectional Slack bot (creating issues from Slack)
- Scheduled report emails
- Custom dashboard layouts
- Data export (CSV/PDF)
