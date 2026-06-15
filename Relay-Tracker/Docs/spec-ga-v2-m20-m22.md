# MISSIONS 20-22: AI, Bulk Operations & Power User Features

**Phase**: GA v2  
**Priority**: 4th-6th Impact Tier  
**Dependencies**: Core v1.0 stable, Mission 17 (WebSockets) for real-time duplicate alerts

---

## EXECUTIVE SUMMARY

This phase transforms Relay from a basic reporting tool into an intelligent, efficient issue management platform by delivering:

1. **Mission 20**: AI-powered duplicate detection
2. **Mission 21**: Bulk actions for issue management
3. **Mission 22**: Saved filters and custom views

---

# MISSION 20: AI-Powered Duplicate Detection

## PROBLEM STATEMENT

### Current State

- Users submit issues without knowing if a similar one already exists
- SQA team wastes significant time triaging and merging duplicate reports
- No warning before issue creation, no visibility into potential matches

### User Pain Points

1. **Reporters**: Embarrassed when their issue is marked as duplicate
2. **SQA Team**: 15-20% of issues require manual duplicate investigation
3. **Developers**: Same bug appears multiple times in their backlog

---

## SOLUTION OVERVIEW

Implement a semantic similarity engine that analyzes issue summaries and descriptions to detect potential duplicates before and after issue creation.

### Detection Flow

```
User Types Summary ──▶ Debounced API Call ──▶ Similarity Engine ──▶ Potential Matches
                                                    │
                                                    ▼
                                            ┌─────────────────┐
                                            │ "Similar issues │
                                            │  found: FS-1234 │
                                            │  FS-1256..."    │
                                            └─────────────────┘
```

---

## FUNCTIONAL REQUIREMENTS

### FR-1: Pre-Submit Duplicate Warning

- **FR-1.1**: As user types the issue summary (after 3+ words), search for similar issues
- **FR-1.2**: Display up to 5 potential duplicates in a collapsible panel
- **FR-1.3**: Show similarity score as percentage (e.g., "87% similar")
- **FR-1.4**: User can click a match to view the existing issue
- **FR-1.5**: User can acknowledge matches and proceed to submit anyway
- **FR-1.6**: If user proceeds, link the new issue to the flagged duplicate (optional)

### FR-2: Post-Submit Analysis (Background)

- **FR-2.1**: After issue creation, run full analysis against the entire backlog
- **FR-2.2**: If strong matches found (>80% similarity), notify SQA via in-app alert
- **FR-2.3**: Store analysis results for SQA review

### FR-3: Similarity Algorithm

- **FR-3.1**: Use TF-IDF or sentence embeddings for text comparison
- **FR-3.2**: Weight issue type (Bug vs Bug) higher than cross-type matches
- **FR-3.3**: Consider only issues from the last 90 days (configurable)
- **FR-3.4**: Exclude issues in "Cancelled" or "Done" status

---

## TECHNICAL SPECIFICATIONS

### Backend

#### Option A: Lightweight (TF-IDF)

```python
# No external AI service, runs locally
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
```

#### Option B: Advanced (OpenAI Embeddings)

```python
# Requires OpenAI API key, higher accuracy
import openai
embeddings = openai.Embedding.create(input=text, model="text-embedding-3-small")
```

**Recommendation**: Start with Option A for v1, migrate to Option B based on accuracy feedback.

#### New Files

| File                                         | Purpose                               |
| :------------------------------------------- | :------------------------------------ |
| `backend/api/services/similarity_service.py` | Core similarity engine                |
| `backend/api/routes/duplicates.py`           | API endpoints for duplicate detection |

#### New Database Table

```sql
CREATE TABLE issue_embeddings (
    issue_key TEXT PRIMARY KEY,
    embedding BLOB,  -- Serialized vector
    summary_text TEXT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE duplicate_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_issue TEXT NOT NULL,
    target_issue TEXT NOT NULL,
    similarity_score REAL NOT NULL,
    reviewed INTEGER DEFAULT 0,
    reviewed_by TEXT,
    reviewed_at DATETIME,
    is_duplicate INTEGER,  -- NULL = pending, 1 = confirmed, 0 = not duplicate
    UNIQUE(source_issue, target_issue)
);
```

#### New API Endpoints

| Endpoint                                | Method | Purpose                                    |
| :-------------------------------------- | :----- | :----------------------------------------- |
| `/api/duplicates/check`                 | POST   | Check summary text for similar issues      |
| `/api/duplicates/candidates`            | GET    | List unreviewed duplicate candidates (SQA) |
| `/api/duplicates/candidates/:id/review` | POST   | Mark candidate as duplicate or not         |

### Frontend

#### New Files

| File                                                  | Purpose                       |
| :---------------------------------------------------- | :---------------------------- |
| `frontend/src/components/issues/DuplicateWarning.tsx` | Warning panel in create modal |
| `frontend/src/pages/admin/DuplicateReview.tsx`        | SQA review queue page         |

#### Modified Files

| File                                                  | Changes                              |
| :---------------------------------------------------- | :----------------------------------- |
| `frontend/src/components/issues/CreateIssueModal.tsx` | Add duplicate check on summary input |

---

## UI BEHAVIOR

### Create Issue Modal with Duplicate Warning

```
┌────────────────────────────────────────────────────────────────┐
│  Report Bug                                              [×]   │
├────────────────────────────────────────────────────────────────┤
│  Summary *                                                     │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Login button not working on mobile Safari                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ⚠️  Similar issues found — check if this is a duplicate  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 🐛 FS-1234: Login fails on iOS Safari (87% match)        │  │
│  │    Created 3 days ago • Status: In Progress              │  │
│  │    [View Issue]                                          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ 🐛 FS-1198: Mobile login broken (72% match)              │  │
│  │    Created 2 weeks ago • Status: Done                    │  │
│  │    [View Issue]                                          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ [ ] I've reviewed these and my issue is different        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ... (rest of form)                                            │
│                                                                │
│  [Cancel]                              [Submit Report]          │
│                       (disabled until checkbox is checked)     │
└────────────────────────────────────────────────────────────────┘
```

---

## TESTING CHECKLIST (Mission 20)

- [ ] Typing 3+ words triggers duplicate search
- [ ] Similar issues display with percentage match
- [ ] Clicking "View Issue" opens the existing issue
- [ ] Cannot submit without acknowledging duplicates (if found)
- [ ] Checking "my issue is different" enables submit button
- [ ] Post-submission analysis runs in background
- [ ] SQA can review duplicate candidates
- [ ] Performance: search completes in < 500ms

---

# MISSION 21: Bulk Actions

## PROBLEM STATEMENT

### Current State

- SQA leads must update issues one at a time
- Closing a sprint's worth of issues requires dozens of individual clicks
- No way to batch-reassign issues when team members change

### User Pain Points

1. **SQA Leads**: Spend 30+ minutes on repetitive status updates
2. **Managers**: Can't quickly reassign a departing team member's issues

---

## SOLUTION OVERVIEW

Add multi-select capability to the Issues list with a floating action bar for batch operations.

---

## FUNCTIONAL REQUIREMENTS

### FR-1: Selection

- **FR-1.1**: Checkbox appears on each issue row (left side)
- **FR-1.2**: "Select All" checkbox in table header (selects current page only)
- **FR-1.3**: Selected count displays in floating action bar
- **FR-1.4**: Shift+Click selects a range of issues
- **FR-1.5**: Pressing Escape clears selection

### FR-2: Bulk Actions (Action Bar)

| Action              | Availability | Notes                            |
| :------------------ | :----------- | :------------------------------- |
| **Change Status**   | SQA, Admin   | Dropdown to select target status |
| **Change Priority** | SQA, Admin   | Dropdown to select new priority  |
| **Add Label**       | SQA, Admin   | Add a label to all selected      |
| **Export CSV**      | All users    | Download selected issues as CSV  |

### FR-3: Confirmation & Feedback

- **FR-3.1**: Confirmation dialog before destructive actions
- **FR-3.2**: Progress indicator during bulk operation
- **FR-3.3**: Toast notification with success/failure count
- **FR-3.4**: If some operations fail, show partial success message

---

## TECHNICAL SPECIFICATIONS

### Backend

#### New API Endpoint

| Endpoint           | Method | Payload                                                            |
| :----------------- | :----- | :----------------------------------------------------------------- |
| `/api/issues/bulk` | POST   | `{ action: "status", value: "Done", issueKeys: ["FS-1", "FS-2"] }` |

#### Supported Actions

```python
BULK_ACTIONS = {
    "status": update_status_batch,
    "priority": update_priority_batch,
    "add_label": add_label_batch,
}
```

#### Rate Limiting

- Maximum 50 issues per bulk operation
- Maximum 5 bulk operations per minute per user

### Frontend

#### New Files

| File                                               | Purpose                            |
| :------------------------------------------------- | :--------------------------------- |
| `frontend/src/components/issues/BulkActionBar.tsx` | Floating action bar component      |
| `frontend/src/components/issues/IssueCheckbox.tsx` | Selection checkbox component       |
| `frontend/src/hooks/useSelection.ts`               | Multi-select state management hook |

#### Modified Files

| File                                           | Changes                                |
| :--------------------------------------------- | :------------------------------------- |
| `frontend/src/pages/Issues.tsx`                | Add selection state, render checkboxes |
| `frontend/src/components/issues/IssueList.tsx` | Integrate checkbox column              |

---

## UI WIREFRAME

### Issue List with Selection

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ☑️ Select All    Issues (3 selected)                                      │
├────────────────────────────────────────────────────────────────────────────┤
│  ☑️  FS-1234  Login button not working...     🔴 Highest    In Progress   │
│  ☐   FS-1235  Dashboard shows wrong data...   🟠 High       To Do         │
│  ☑️  FS-1236  Payment fails on retry...       🔴 Highest    QA            │
│  ☑️  FS-1237  Crash on iOS 17.2...            🟡 Medium     In Progress   │
│  ☐   FS-1238  Slow loading times...           🔵 Low        To Do         │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  3 issues selected       [Status ▾]  [Priority ▾]  [Add Label]  [Export]  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## TESTING CHECKLIST (Mission 21)

- [ ] Checkbox appears on each issue row
- [ ] "Select All" selects all issues on current page
- [ ] Shift+Click selects range
- [ ] Action bar appears when 1+ issues selected
- [ ] Status change updates all selected issues
- [ ] Confirmation dialog appears before action
- [ ] Success toast shows count of updated issues
- [ ] Failed operations show appropriate error message
- [ ] Max 50 issues per operation enforced

---

# MISSION 22: Saved Filters & Custom Views

## PROBLEM STATEMENT

### Current State

- Users must manually re-apply filters every session
- Common queries like "My Open Bugs" require multiple filter selections
- No way to share useful filter combinations with the team

### User Pain Points

1. **Power Users**: Waste time re-configuring the same filters daily
2. **Teams**: Can't standardize on common views (e.g., "Sprint 42 Bugs")

---

## SOLUTION OVERVIEW

Allow users to save filter configurations as named views that can be accessed from a sidebar or dropdown.

---

## FUNCTIONAL REQUIREMENTS

### FR-1: Saving Filters

- **FR-1.1**: "Save View" button appears when filters are active
- **FR-1.2**: User provides a name for the view
- **FR-1.3**: Saved views are private by default
- **FR-1.4**: Admin can mark views as "Team" views (visible to all)

### FR-2: Accessing Views

- **FR-2.1**: Saved views appear in a dropdown or sidebar panel
- **FR-2.2**: Clicking a saved view applies all its filters instantly
- **FR-2.3**: "My Open Issues" is a built-in default view (cannot be deleted)
- **FR-2.4**: User can edit, rename, or delete their saved views

### FR-3: View Configuration

Each saved view stores:

- Filter parameters (status, priority, type, assignee, reporter, search query)
- Sort order
- Column visibility (future enhancement)

---

## TECHNICAL SPECIFICATIONS

### Backend

#### New Database Table

```sql
CREATE TABLE saved_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    user_id TEXT NOT NULL,  -- Owner, NULL for team views
    filters TEXT NOT NULL,  -- JSON: { "status": [...], "priority": [...], etc. }
    sort_by TEXT,
    sort_order TEXT DEFAULT 'desc',
    is_team_view INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);
```

#### New API Endpoints

| Endpoint         | Method | Purpose                        |
| :--------------- | :----- | :----------------------------- |
| `/api/views`     | GET    | List user's views + team views |
| `/api/views`     | POST   | Create new saved view          |
| `/api/views/:id` | PUT    | Update view                    |
| `/api/views/:id` | DELETE | Delete view                    |

### Frontend

#### New Files

| File                                                   | Purpose                      |
| :----------------------------------------------------- | :--------------------------- |
| `frontend/src/components/issues/SavedViewsSidebar.tsx` | Sidebar panel for views      |
| `frontend/src/components/issues/SaveViewModal.tsx`     | Modal for naming/saving view |
| `frontend/src/hooks/useSavedViews.ts`                  | Data fetching and mutations  |

#### Modified Files

| File                                           | Changes                       |
| :--------------------------------------------- | :---------------------------- |
| `frontend/src/pages/Issues.tsx`                | Apply saved view on selection |
| `frontend/src/components/issues/FilterBar.tsx` | Add "Save View" button        |

---

## UI WIREFRAME

### Filter Bar with Save Button

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Filters: [Status: In Progress ×] [Priority: Highest ×] [Type: Bug ×]     │
│                                                         [Clear] [💾 Save]  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Saved Views Dropdown

```
┌──────────────────────────────┐
│  📁 Views                    │
├──────────────────────────────┤
│  ★ My Open Issues (default)  │
│  🔒 High Priority Bugs       │
│  🔒 Assigned to Me           │
├──────────────────────────────┤
│  👥 Team Views               │
│  • Sprint 42 Backlog         │
│  • Production Blockers       │
├──────────────────────────────┤
│  [+ Create New View]         │
└──────────────────────────────┘
```

---

## TESTING CHECKLIST (Mission 22)

- [ ] "Save View" button appears when filters are active
- [ ] Save modal allows naming the view
- [ ] Saved view appears in dropdown
- [ ] Clicking saved view applies all filters
- [ ] View can be edited and changes persist
- [ ] View can be deleted
- [ ] Admin can create team views
- [ ] Team views visible to all users
- [ ] "My Open Issues" default view works correctly

---

## COMBINED SECURITY CONSIDERATIONS

1. **AI Service (M20)**: If using OpenAI, ensure API key is never exposed to frontend
2. **Bulk Actions (M21)**: Enforce strict authorization; only SQA/Admin can modify
3. **Saved Views (M22)**: Users can only modify their own views; validate team view permissions

---

## SUCCESS METRICS

| Metric                          | Target           |
| :------------------------------ | :--------------- |
| Duplicate issues submitted      | -50% reduction   |
| Time spent on bulk triage tasks | -60% reduction   |
| Saved views created per user    | > 2 average      |
| User satisfaction (UX survey)   | +25% improvement |

---

## OUT OF SCOPE FOR THIS PHASE

- AI-assisted issue categorization
- Cross-project bulk actions
- View sharing via URL
- Custom column configuration
