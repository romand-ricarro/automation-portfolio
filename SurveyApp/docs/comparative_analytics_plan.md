# Mission E: Comparative Analytics Implementation Plan

## Goal Description

Elevate InsightPulse from a session-level tool to a strategic intelligence platform. Comparative Analytics will allow admins and stakeholders to compare facilitator performance, track trends across different time periods, and benchmark individual sessions against global averages.

## User Review Required

> [!IMPORTANT]
> **Proposed Access Model (RBAC)**:
>
> - **Admins/Viewers**: Full access to side-by-side comparisons of all facilitators.
> - **Facilitators**: Restricted to a "Personal Benchmarking" view. They can see their own trends and how they compare to the **Anonymous Global Average**, but not the specific scores of their colleagues. This promotes growth without creating direct competition or privacy issues.

## Proposed Changes

### Backend (Flask API)

#### [MODIFY] [dashboard.py](file:///Users/romand/Documents/GitHub/SurveyApp/backend/api/dashboard.py)

- **New Endpoint**: `/api/dashboard/comparison`
  - Accepts a list of `facilitator_names` or `time_ranges`.
  - Returns side-by-side aggregated ratings for comparison (Understanding, QA, Articulation, Overall).
- **New Endpoint**: `/api/dashboard/benchmarks`
  - Compares a specific `session_id` against the global average and the facilitator's personal average.

---

### Frontend (React/Vite)

#### [NEW] `ComparativeCharts.tsx`

- Radar charts for side-by-side facilitator comparison across all 5 metrics.
- **Growth Monitoring**: Sparklines showing performance "Delta" (+/- %) compared to the previous period.
- **Trend Comparison**: Line charts comparing multiple facilitators over time.

#### [NEW] `BenchmarksCard.tsx`

- **Session vs. Global**: Gauges comparing a session to the global/facilitator average.
- **Outlier Detection**: Automated flags for sessions that deviate significantly from a facilitator's mean.

#### [NEW] `StrategicInsights.tsx`

- **Correlation Engine**: Automated text insights (e.g., "Decreased Pace correlates with 30% lower Learning Objectives score").

#### [MODIFY] `Dashboard.tsx`

- Add a toggle between "Overview" and "Comparative View."
- **Export Action**: Add a "Monthly Snapshot PDF" generator for stakeholders.

---

## Verification Plan

### Automated Tests

- `pytest backend/tests/test_dashboard_comparison.py`: Verify aggregation logic and RBAC (Facilitators shouldn't be able to compare themselves against others if the "Competitor privacy" rule applies).

### Manual Verification

1. Log in as **Admin**.
2. Select "John Smith" and "Jane Doe" in the comparison tool.
3. Verify that the Radar chart accurately reflects the difference in their "QA Support" scores.
4. Verify that the trend lines show performance over the last 6 months.
