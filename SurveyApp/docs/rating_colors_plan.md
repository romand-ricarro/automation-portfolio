# Performance-Based Rating Colors Implementation Plan

## Goal

Transform the rating cards in the Session Detail view from a static "highlight" style to a dynamic "Traffic Light" system where colors reflect the actual performance score.

## Logic (The "Traffic Light" System)

| Score Range    | Color Sentiment  | CSS Classes (Tailwind)        |
| -------------- | ---------------- | ----------------------------- |
| **8.0 - 10.0** | **Excellent**    | `bg-emerald-600` (Emerald)    |
| **6.5 - 7.9**  | **Good/Average** | `bg-amber-500` (Amber/Orange) |
| **< 6.5**      | **Needs Action** | `bg-rose-600` (Rose/Red)      |

---

## Proposed Changes

### [MODIFY] [SessionDetail.tsx](file:///Users/romand/Documents/GitHub/SurveyApp/frontend/src/components/sessions/SessionDetail.tsx)

#### 1. Refactor `RatingCard` Component

- Remove the boolean `highlight` prop.
- Add a internal function `getRatingColor(value: number)` to return the appropriate Tailwind classes based on the logic above.
- Ensure the text contrast remains high (white text for all colored backgrounds).

#### 2. Update Usage

- Update the instances of `<RatingCard />` in the main `SessionDetail` render method to remove the `highlight` prop, as all cards will now be dynamically colored.

---

## Verification Plan

### Manual Verification

1. Open a session with high ratings (>8.0) -> Verify cards are **Emerald Green**.
2. Open a session with mid-tier ratings (7.0) -> Verify cards are **Amber/Orange**.
3. Open a session with low ratings (<6.5) -> Verify cards are **Rose Red**.
4. Check both **Light** and **Dark** modes to ensure gradient/shadow contrast looks premium.

### Automated Tests

- No automated tests planned for this visual tweak unless explicitly requested.

---

## Estimated Time

- Implementation: 30 minutes
- Visual Polish: 15 minutes
- **Total: ~45 minutes**
