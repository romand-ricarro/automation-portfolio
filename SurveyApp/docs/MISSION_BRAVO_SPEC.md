# Mission Bravo: UX Quick Wins

## Mission Overview

**Codename**: Bravo  
**Phase**: Production Phase 1  
**Duration**: ~2 weeks  
**Prerequisites**: Mission Alpha complete (monitoring, validation, rate limiting, tests in place)

Mission Bravo delivers high-impact user experience improvements. The three features in this mission address the most common user pain points: waiting blindly during analysis, inability to share results offline, and slow repeat analyses.

---

## Current State & Problems

### 1. Blind Waiting During Analysis

- When a user triggers analysis, they see only a generic loading spinner
- Analysis involves multiple steps: fetching sheets → analyzing 4 questions → generating common issues
- Each step can take 10-30 seconds; total wait can exceed 2 minutes
- Users have no idea if it's working or stuck
- They sometimes refresh, causing duplicate analyses

### 2. No Export Capability

- Stakeholders (managers, clients) often need reports for meetings
- Currently, they must screenshot the UI or copy/paste manually
- No way to share analysis results with non-users
- No audit trail or archival format

### 3. Redundant AI Processing

- Clicking "Analyze" on the same session re-runs the entire OpenAI analysis
- Same survey data produces identical results (deterministic prompts)
- Wastes money on duplicate OpenAI API calls
- Wastes user time waiting for results they already have

---

## Detailed Requirements

### Task 1: Real-time Analysis Progress (Server-Sent Events)

#### Why SSE over WebSocket?

- SSE is simpler for one-way server→client communication
- Works with Vercel serverless functions
- No need for bidirectional communication
- Better browser support, simpler implementation

#### Backend Requirements

1. **Create SSE endpoint for analysis progress**

   **Endpoint**: `GET /api/sessions/<session_id>/analyze/stream`

   **Authentication**: Must validate JWT token from query param (SSE doesn't support headers easily)

   **Response**: `text/event-stream` content type

   **Event format**:

   ```
   event: progress
   data: {"step": "fetching_sheets", "message": "Connecting to Google Sheets...", "progress": 10}

   event: progress
   data: {"step": "analyzing_question", "message": "Analyzing: What did you learn?", "progress": 30, "current": 1, "total": 4}

   event: progress
   data: {"step": "generating_issues", "message": "Identifying common themes...", "progress": 80}

   event: complete
   data: {"session_id": "uuid", "status": "completed"}

   event: error
   data: {"error": "Failed to connect to Google Sheets", "code": "SHEETS_ERROR"}
   ```

2. **Progress steps breakdown**

   | Step                 | Progress % | Message Template                                                  |
   | -------------------- | ---------- | ----------------------------------------------------------------- |
   | `fetching_sheets`    | 5-10       | "Connecting to Google Sheets..." / "Fetching survey responses..." |
   | `processing_data`    | 10-15      | "Processing {n} responses..."                                     |
   | `analyzing_question` | 15-75      | "Analyzing: {question_name} ({current}/{total})"                  |
   | `generating_issues`  | 75-90      | "Identifying common themes..."                                    |
   | `saving_results`     | 90-95      | "Saving analysis results..."                                      |
   | `complete`           | 100        | "Analysis complete!"                                              |

3. **Modify analysis orchestration**
   - Refactor `sessions.py` analysis logic to yield progress events
   - Use Python generator pattern for streaming
   - Each step emits progress before executing

4. **Error handling in stream**
   - Catch exceptions within stream
   - Emit `error` event with user-friendly message
   - Log full error to Sentry (from Mission Alpha)
   - Close stream gracefully

5. **Keep existing non-streaming endpoint**
   - Maintain `POST /api/sessions/<id>/analyze` for backwards compatibility
   - New frontend uses streaming; old clients still work

#### Frontend Requirements

1. **Create SSE client hook**

   **File**: `frontend/src/hooks/useAnalysisProgress.ts`

   ```typescript
   interface AnalysisProgress {
     step: string;
     message: string;
     progress: number; // 0-100
     current?: number;
     total?: number;
   }

   interface UseAnalysisProgressResult {
     startAnalysis: (sessionId: string) => void;
     cancelAnalysis: () => void;
     progress: AnalysisProgress | null;
     isAnalyzing: boolean;
     error: string | null;
     isComplete: boolean;
   }
   ```

2. **Progress UI component**

   **File**: `frontend/src/components/sessions/AnalysisProgress.tsx`
   - Animated progress bar (0-100%)
   - Current step message displayed below bar
   - Step indicator showing "{current} of {total}" for question analysis
   - Estimated time remaining (based on average step duration)
   - Cancel button to abort analysis
   - Success animation on completion
   - Error state with retry button

3. **Integration in SessionDetail**
   - Replace simple loading spinner with AnalysisProgress component
   - When "Analyze" clicked, switch to progress view
   - On completion, refresh session data and show results
   - On error, show error state with retry option

4. **UX polish**
   - Smooth progress bar animation (CSS transitions)
   - Pulsing animation during active step
   - Checkmarks for completed steps
   - Confetti or subtle celebration on completion (optional)

#### Files to Modify/Create

| File                                                    | Action | Description                                   |
| ------------------------------------------------------- | ------ | --------------------------------------------- |
| `backend/api/sessions.py`                               | MODIFY | Add SSE streaming endpoint                    |
| `backend/services/analysis_orchestrator.py`             | CREATE | Generator-based analysis with progress yields |
| `frontend/src/hooks/useAnalysisProgress.ts`             | CREATE | SSE client hook                               |
| `frontend/src/components/sessions/AnalysisProgress.tsx` | CREATE | Progress UI component                         |
| `frontend/src/components/sessions/SessionDetail.tsx`    | MODIFY | Integrate progress component                  |
| `frontend/src/styles/analysis-progress.css`             | CREATE | Progress bar animations                       |

---

### Task 2: Export Reports (PDF & Excel)

#### Backend Requirements

1. **Install export libraries**
   - Add `reportlab>=4.0.0` for PDF generation
   - Add `openpyxl>=3.1.0` for Excel generation

2. **PDF Export endpoint**

   **Endpoint**: `GET /api/sessions/<session_id>/export/pdf`

   **Response**: `application/pdf` with `Content-Disposition: attachment; filename="session_{id}_report.pdf"`

   **PDF structure**:

   ```
   PAGE 1: Cover
   - InsightPulse logo placeholder (or text header)
   - Session title: "{Session ID} - {Date}"
   - Facilitator name
   - Number of responses
   - Generated on: {timestamp}

   PAGE 2: Session Ratings Summary
   - Table with 9 metrics and scores
   - Visual rating bars (can be simple rectangles)
   - Overall average score

   PAGE 3-N: Question Analyses
   - One section per question (may span pages)
   - Question title
   - Summary paragraph
   - Key points as bullet list
   - Representative quotes (if stored)

   FINAL PAGES: Common Issues Table
   - Table format matching UI
   - Columns: Issue, Description, Frequency, Priority
   - Color coding for priority (or text labels)

   APPENDIX: Action Items (if any)
   - Table with title, status, assignee, due date
   ```

3. **Excel Export endpoint**

   **Endpoint**: `GET /api/sessions/<session_id>/export/excel`

   **Response**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

   **Excel structure** (multiple sheets):

   ```
   Sheet 1: "Overview"
   - Session metadata (ID, date, facilitator, responses)
   - Ratings in table format

   Sheet 2: "Question Analyses"
   - One row per question
   - Columns: Question, Summary, Key Points (semicolon-separated)

   Sheet 3: "Common Issues"
   - One row per issue
   - Columns: Issue, Description, Frequency, Priority, Related Questions

   Sheet 4: "Action Items"
   - One row per action item
   - Columns: Title, Description, Status, Priority, Assignee, Due Date, Created

   Sheet 5: "Raw Ratings" (optional)
   - Individual response ratings if stored
   ```

4. **Export service layer**

   **File**: `backend/services/export_service.py`

   Functions:
   - `generate_pdf_report(session: Session) -> bytes`
   - `generate_excel_report(session: Session) -> bytes`
   - `get_session_export_data(session_id: str) -> dict` (shared data fetching)

5. **Error handling**
   - Return 404 if session not found
   - Return 400 if session has no analysis (nothing to export)
   - Log export requests for analytics

#### Frontend Requirements

1. **Export buttons in SessionDetail**
   - Add "Export" dropdown or button group
   - Options: "Download PDF", "Download Excel"
   - Loading state while generating
   - Direct download (no modal)

2. **Export button component**

   **File**: `frontend/src/components/common/ExportButtons.tsx`
   - Reusable component for export actions
   - Props: `sessionId`, `disabled`, `formats` (array of 'pdf' | 'excel')
   - Handles download via blob URL

3. **API service update**

   **File**: `frontend/src/services/api.ts`
   - Add `exportSessionPdf(sessionId)` function
   - Add `exportSessionExcel(sessionId)` function
   - Handle blob response type

#### Files to Modify/Create

| File                                                 | Action | Description                               |
| ---------------------------------------------------- | ------ | ----------------------------------------- |
| `backend/requirements.txt`                           | MODIFY | Add `reportlab>=4.0.0`, `openpyxl>=3.1.0` |
| `backend/api/sessions.py`                            | MODIFY | Add export endpoints                      |
| `backend/services/export_service.py`                 | CREATE | PDF and Excel generation                  |
| `frontend/src/components/common/ExportButtons.tsx`   | CREATE | Export button component                   |
| `frontend/src/components/sessions/SessionDetail.tsx` | MODIFY | Add export buttons                        |
| `frontend/src/services/api.ts`                       | MODIFY | Add export API calls                      |

---

### Task 3: AI Analysis Caching

#### Backend Requirements

1. **Caching strategy**
   - Cache key: Hash of input data (spreadsheet_id + sheet content hash)
   - Storage: Database (new `AnalysisCache` table)
   - TTL: 7 days (configurable via env var)
   - Cache invalidation: Manual "Force Re-analyze" or automatic on data change

2. **Database model**

   **New model**: `AnalysisCache`

   ```python
   class AnalysisCache(db.Model):
       id = Column(UUID, primary_key=True)
       session_id = Column(UUID, ForeignKey('sessions.id'), nullable=False)
       input_hash = Column(String(64), nullable=False, index=True)  # SHA-256
       created_at = Column(DateTime, default=datetime.utcnow)
       expires_at = Column(DateTime, nullable=False)

       # Unique constraint on session_id + input_hash
   ```

3. **Input hashing**

   **File**: `backend/services/cache_service.py`
   - Function: `compute_input_hash(responses: List[dict]) -> str`
   - Hash the normalized survey response data
   - Exclude non-deterministic fields (timestamp of fetch, etc.)
   - Use SHA-256 for hash

4. **Cache check in analysis flow**

   Before running OpenAI analysis:

   ```python
   1. Fetch survey data from Google Sheets
   2. Compute input hash
   3. Check if AnalysisCache exists with matching hash and not expired
   4. IF cache hit:
      - Return existing QuestionAnalysis and CommonIssue records
      - Log cache hit (INFO level)
      - Skip OpenAI calls
   5. IF cache miss:
      - Proceed with OpenAI analysis
      - Create AnalysisCache record after success
      - Log cache miss (INFO level)
   ```

5. **Force re-analyze option**

   **Endpoint modification**: `POST /api/sessions/<id>/analyze`

   Accept optional query param: `?force=true`

   If force=true:
   - Delete existing AnalysisCache for session
   - Proceed with fresh analysis
   - Log forced re-analysis (INFO level)

6. **Cache statistics** (optional, for dashboard)
   - Track: cache hits, cache misses, cache size
   - Expose via admin stats endpoint

#### Frontend Requirements

1. **UI indicators**
   - Show "Cached result from {date}" if result came from cache
   - Add "Re-analyze" button that uses `force=true`
   - Tooltip explaining: "Results are cached for 7 days. Click to re-analyze with fresh data."

2. **Visual distinction**
   - Subtle badge or icon indicating cached vs fresh result
   - Last analyzed timestamp displayed

3. **SessionDetail modifications**
   - Display cache status
   - "Re-analyze" button (admin/facilitator only)

#### Files to Modify/Create

| File                                                 | Action | Description                              |
| ---------------------------------------------------- | ------ | ---------------------------------------- |
| `backend/models/database.py`                         | MODIFY | Add `AnalysisCache` model                |
| `backend/services/cache_service.py`                  | CREATE | Caching logic and hash computation       |
| `backend/api/sessions.py`                            | MODIFY | Cache check before analysis, force param |
| `backend/migrations/`                                | ADD    | New migration for AnalysisCache table    |
| `frontend/src/components/sessions/SessionDetail.tsx` | MODIFY | Show cache status, re-analyze button     |
| `frontend/src/types/index.ts`                        | MODIFY | Add cache fields to Session type         |

---

## Acceptance Criteria

### Real-time Progress

| Criteria                                                       | Verification                      |
| -------------------------------------------------------------- | --------------------------------- |
| Progress bar displays and updates during analysis              | Trigger analysis, observe UI      |
| All 6 progress steps shown with appropriate messages           | Verify each step message appears  |
| Error during analysis shows error state with retry option      | Simulate OpenAI failure           |
| Cancel button stops analysis and shows cancelled state         | Click cancel mid-analysis         |
| Multiple users can analyze simultaneously without interference | Two browsers, concurrent analyses |

### Export Reports

| Criteria                                                                  | Verification            |
| ------------------------------------------------------------------------- | ----------------------- |
| PDF exports with all sections (cover, ratings, analyses, issues, actions) | Download and open PDF   |
| Excel exports with 4 sheets and correct data                              | Download and open Excel |
| Exports include all session data accurately                               | Compare with UI         |
| 404 returned for non-existent session                                     | Test with bad ID        |
| 400 returned for session without analysis                                 | Test unanalyzed session |

### AI Caching

| Criteria                                            | Verification               |
| --------------------------------------------------- | -------------------------- |
| Repeat analysis of unchanged data returns instantly | Time second analysis       |
| Cache hit is logged                                 | Check logs                 |
| "Force re-analyze" bypasses cache and runs fresh    | Use force=true, time it    |
| UI shows "Cached from {date}" for cached results    | Check UI display           |
| Cache expires after 7 days                          | Set short TTL, test expiry |

---

## Environment Variables Added

| Variable                  | Location       | Default | Description                              |
| ------------------------- | -------------- | ------- | ---------------------------------------- |
| `ANALYSIS_CACHE_TTL_DAYS` | Backend `.env` | 7       | Number of days to cache analysis results |

---

## Dependencies Added

### Backend (`requirements.txt`)

```
reportlab>=4.0.0
openpyxl>=3.1.0
```

---

## Database Migrations

```bash
# After adding AnalysisCache model
flask db migrate -m "Add AnalysisCache table"
flask db upgrade
```

---

## Testing Checklist

### Real-time Progress Tests

- [ ] SSE connection establishes successfully
- [ ] All progress events fire in correct order
- [ ] Progress percentages are monotonically increasing
- [ ] Error events fire on failure
- [ ] Connection closes cleanly on completion
- [ ] Frontend displays all progress states

### Export Tests

- [ ] PDF generates valid PDF file
- [ ] PDF contains all expected sections
- [ ] Excel generates valid XLSX file
- [ ] Excel has correct sheet structure
- [ ] Both exports work for large sessions (100+ responses)
- [ ] Exports fail gracefully for incomplete data

### Caching Tests

- [ ] Cache hit returns same data as original analysis
- [ ] Cache miss triggers full analysis
- [ ] Input hash changes when survey data changes
- [ ] Force flag bypasses cache
- [ ] Expired cache triggers re-analysis
- [ ] Cache cleanup removes old entries

---

## Performance Targets

| Metric                    | Target                  |
| ------------------------- | ----------------------- |
| SSE connection latency    | <500ms                  |
| Progress update frequency | Every 2-5 seconds       |
| PDF generation time       | <5s for typical session |
| Excel generation time     | <3s for typical session |
| Cache lookup time         | <100ms                  |
| Cached analysis response  | <200ms total            |
