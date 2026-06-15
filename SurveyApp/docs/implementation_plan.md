# Implementation Plan: Facilitator Insights ("Real ROI" Reports) ✅ COMPLETED

## Goal
Transform the **Reports** page from a static scorecard into a dynamic diagnostic tool. Stakeholders need to see **Performance Trends** (is the facilitator improving?) and **Session History** (consistency checks) to determine true ROI.

---

## 1. Backend Implementation (Data Layer)
We need a way to fetch the chronological history for a specific facilitator.

#### [NEW] [dashboard.py](file:///Users/romand/Documents/GitHub/SurveyApp/backend/api/dashboard.py)
- **Endpoint**: `/api/dashboard/facilitator-history`
- **Method**: `GET`
- **Query Param**: `?name=Xin%20Zhou`
- **Logic**:
    1.  Query [Session](file:///Users/romand/Documents/GitHub/SurveyApp/backend/models/database.py#37-73) join [SessionRating](file:///Users/romand/Documents/GitHub/SurveyApp/backend/models/database.py#151-182).
    2.  Filter by `facilitator_name` (trimmed/normalized).
    3.  Order by [session_date](file:///Users/romand/Documents/GitHub/SurveyApp/backend/api/sessions.py#38-51) ASC (crucial for trend lines).
    4.  Return list of objects: `{ date, session_name, overall_score, ... }`

*(Note: The basic code for this was drafted in the previous step, but we will ensure it is fully robust and tested).*

---

## 2. Frontend Implementation (Visual Layer)
We will upgrade [Reports.tsx](file:///Users/romand/Documents/GitHub/SurveyApp/frontend/src/components/reports/Reports.tsx) to handle "drill-down" analysis.

#### [MODIFY] [Reports.tsx](file:///Users/romand/Documents/GitHub/SurveyApp/frontend/src/components/reports/Reports.tsx)

### A. "View Insights" Action
- Update the `FacilitatorCard` to include a prominent **"View Performance History"** button.
- Interaction: Opens a generic component (Modal or Drawer) to keep context.

### B. The Insights View (Modal)
This new view answers two questions: "Are they getting better?" and "Were they consistent?"

#### 1. Trend Line Graph (The "Trajectory" View)
- A custom, lightweight SVG chart.
- **X-Axis**: Time (Session 1 → Session N).
- **Y-Axis**: Overall Rating (0-10).
- **Visuals**: 
    - A smooth line connecting data points.
    - Dots representing individual sessions.
    - Green/Red zones (e.g., above 8.0 is green).
- *Value*: Instantly visualizes the ROI curve.

#### 2. Session History Table (The "Audit" View)
- A simple chronological list below the chart.
- **Columns**: Date | Session Name | Understanding | Overall Score.
- *Value*: Allows checking if a low average is due to one bad outlier or a consistent problem.

---

## Verification Plan

### Manual UI Check
1.  **Load Reports**: Verify the main list still works.
2.  **Open Insights**: Click "View Performance History" for a facilitator with >1 session.
3.  **Verify Chart**:
    - Does the line go up/down correctly matching the scores?
    - Are the dates chronological?
4.  **Verify Table**:
    - Do the numbers in the table match the main report averages?

---
*This plan supersedes previous plans. All focus is on the Reports/ROI feature.*
