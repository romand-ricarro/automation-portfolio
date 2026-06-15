# Mission Delta: Advanced Analytics

## Overview

**Codename**: Delta | **Phase**: Future Development | **Duration**: ~3-4 weeks  
**Prerequisites**: Missions Alpha, Bravo, and Charlie complete

This mission unlocks deeper insights through comparative analytics, historical trends, and power-user features for bulk operations.

---

## Task 1: Comparative Analytics Dashboard

### Problem

- No way to compare sessions side-by-side
- Can't identify which facilitators perform better
- Unable to see if issues are recurring across sessions

### Features

**Session Comparison View**

- Select 2-4 sessions to compare
- Side-by-side ratings comparison chart
- Common issues overlap detection
- Facilitator performance comparison

**UI Components**

- Multi-select dropdown for session selection
- Comparison chart (bar chart with grouped bars)
- Venn diagram or table showing shared issues
- Delta indicators (+15%, -10%) for metrics

### API Endpoints

| Endpoint                           | Method | Description               |
| ---------------------------------- | ------ | ------------------------- |
| `/api/analytics/compare`           | POST   | Compare selected sessions |
| `/api/analytics/facilitator-stats` | GET    | Aggregate by facilitator  |

**Request**: `POST /api/analytics/compare`

```json
{
  "session_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response**:

```json
{
  "sessions": [...],
  "ratings_comparison": {
    "repeatability": [4.2, 4.5, 3.8],
    "quality": [4.0, 4.3, 4.1]
  },
  "common_issues_overlap": [
    {"issue": "Unclear objectives", "sessions": ["uuid1", "uuid3"]}
  ]
}
```

### Files to Create

- `backend/api/analytics.py` - New analytics blueprint
- `frontend/src/pages/AnalyticsPage.tsx`
- `frontend/src/components/analytics/SessionComparison.tsx`
- `frontend/src/components/analytics/ComparisonChart.tsx`

---

## Task 2: Historical Trend Analysis

### Problem

- No visibility into improvement over time
- Can't see if ratings are trending up or down
- No correlation between issues and ratings

### Features

**Trends Dashboard**

- Line chart of average ratings over time
- Filter by date range, facilitator, training type
- Issue frequency over time
- Correlation insights (sessions with X issue have Y% lower ratings)

**Aggregation Logic**

- Group sessions by week/month
- Calculate rolling averages
- Track issue occurrence frequency

### Database Additions

No new models, but add indexes for performance:

```sql
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_common_issues_session ON common_issues(session_id);
```

### API Endpoints

| Endpoint                         | Method | Description               |
| -------------------------------- | ------ | ------------------------- |
| `/api/analytics/trends`          | GET    | Rating trends over time   |
| `/api/analytics/issue-frequency` | GET    | Issue occurrence trends   |
| `/api/analytics/correlations`    | GET    | Issue-rating correlations |

**Query params**: `start_date`, `end_date`, `facilitator_id`, `group_by` (week/month)

### Frontend Components

- `TrendChart.tsx` - Line chart with filters
- `IssueFrequencyChart.tsx` - Bar/area chart
- `CorrelationInsights.tsx` - Cards with insights

---

## Task 3: Bulk Session Import

### Problem

- Sessions imported one at a time
- Cannot import from multi-tab spreadsheets
- No batch processing capability

### Features

**Multi-sheet Import**

- Detect multiple tabs in a spreadsheet
- Preview which tabs contain valid data
- Select tabs to import
- Background processing with progress

**Batch Queue**

- Import multiple spreadsheets at once
- Queue management UI
- Progress tracking per import

### Implementation

1. **Sheet Detection Endpoint**

   ```
   POST /api/sessions/detect-sheets
   Body: { "spreadsheet_id": "..." }
   Response: { "sheets": [{"name": "Jan 2024", "rows": 50}, ...] }
   ```

2. **Bulk Import Endpoint**

   ```
   POST /api/sessions/import-bulk
   Body: {
     "spreadsheet_id": "...",
     "sheets": ["Jan 2024", "Feb 2024"]
   }
   Response: { "job_id": "...", "total_sheets": 2 }
   ```

3. **Job Status Endpoint**
   ```
   GET /api/sessions/import-status/<job_id>
   Response: {
     "status": "processing",
     "completed": 1,
     "total": 2,
     "results": [{"sheet": "Jan 2024", "session_id": "..."}]
   }
   ```

### Database Model

**ImportJob**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| spreadsheet_id | String | Source spreadsheet |
| status | Enum | pending/processing/completed/failed |
| sheets | JSON | List of sheet names to import |
| results | JSON | Import results per sheet |
| created_at | DateTime | Job creation time |

### Files to Create

- `backend/models/database.py` - Add ImportJob
- `backend/api/sessions.py` - Add bulk endpoints
- `backend/services/import_service.py` - Bulk import logic
- `frontend/src/components/sessions/BulkImportModal.tsx`

---

## Task 4: Flexible Google Sheets Schema

### Problem

- Column mapping hardcoded in `google_sheets_service.py`
- Can't adapt to different survey formats
- Adding questions requires code changes

### Features

**Schema Configuration UI**

- Admin page to define column mappings
- Drag-and-drop column assignment
- Preview with sample data
- Save named configurations

**Dynamic Schema Model**

```python
class SheetSchema(db.Model):
    id = Column(UUID, primary_key=True)
    name = Column(String(100))
    is_default = Column(Boolean, default=False)
    column_mappings = Column(JSON)  # {"timestamp": 0, "email": 1, ...}
    question_columns = Column(JSON)  # [{"name": "What did you learn?", "index": 5}]
    rating_columns = Column(JSON)  # [{"name": "Repeatability", "index": 10}]
```

### API Endpoints

| Endpoint                    | Method         | Description           |
| --------------------------- | -------------- | --------------------- |
| `/api/schemas`              | GET/POST       | List/create schemas   |
| `/api/schemas/<id>`         | GET/PUT/DELETE | Manage schema         |
| `/api/schemas/<id>/preview` | POST           | Test schema with data |

### Implementation

- Modify `google_sheets_service.py` to accept schema config
- Load active schema from database
- Fall back to hardcoded default if none defined

---

## Acceptance Criteria

### Comparative Analytics

- [ ] Can select 2-4 sessions for comparison
- [ ] Bar chart shows ratings side-by-side
- [ ] Shared issues highlighted
- [ ] Facilitator stats displayed

### Historical Trends

- [ ] Line chart shows ratings over time
- [ ] Date range filter works
- [ ] Issue frequency chart displays
- [ ] At least one correlation insight shown

### Bulk Import

- [ ] Multi-sheet detection works
- [ ] Can import multiple sheets at once
- [ ] Progress tracking for bulk jobs
- [ ] Failed imports handled gracefully

### Flexible Schema

- [ ] Admin can create new schema
- [ ] Schema applies to new imports
- [ ] Preview validates column mapping
- [ ] Default schema works if none set

---

## Performance Considerations

| Query              | Optimization                         |
| ------------------ | ------------------------------------ |
| Trends aggregation | Add date indexes, limit to 12 months |
| Comparison         | Cache computed comparisons           |
| Issue frequency    | Pre-aggregate monthly counts         |
| Bulk import        | Background job queue                 |

---

## Files Summary

| File                                                   | Action                              |
| ------------------------------------------------------ | ----------------------------------- |
| `backend/api/analytics.py`                             | CREATE                              |
| `backend/services/analytics_service.py`                | CREATE                              |
| `backend/services/import_service.py`                   | CREATE                              |
| `backend/models/database.py`                           | MODIFY (add ImportJob, SheetSchema) |
| `frontend/src/pages/AnalyticsPage.tsx`                 | CREATE                              |
| `frontend/src/components/analytics/*`                  | CREATE                              |
| `frontend/src/components/sessions/BulkImportModal.tsx` | CREATE                              |
| `frontend/src/pages/admin/SchemaConfigPage.tsx`        | CREATE                              |

---

## Dependencies

No new backend dependencies required.

Frontend charting (if not already present):

```json
"recharts": "^2.10.0"
```

---

## Data Requirements

> [!IMPORTANT]
> **Historical trends require sufficient data.** Recommend having at least 10+ sessions over 2+ months before this mission provides meaningful insights.
