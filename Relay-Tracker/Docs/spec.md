# MISSION 14: Reliability, UI Aesthetics & SOP Compliance

Fix pagination errors, improve data freshness, polish the UI, and implement advanced reporter, filtering, and **SOP-Strict** reporting logic for Bugs, Stories, and Tasks.

## PROBLEM

- **SOP Misalignment**: "Create Issue" is one-size-fits-all. Stories and Tasks need specific required fields.
- **Identity Gap**: Jira shows "Tech Tools" only. We need the real "Relay Reporter" identity on the issue page.
- **Unauthorized Editing**: Status and Priority must be read-only on Relay.
- **Navigation Friction**: High friction moving between list and detail pages.
- **One-Way Filtering**: No way to exclude specific items (IS NOT).

## SOLUTION

Implement robust total count detection, dynamic status/priority UI, internal reporter lookup, sequential navigation, and **Dynamic SOP Forms** with validated fields.

---

## DESCRIPTION TEMPLATES (The "Output" to Jira)

Relay's backend will automatically wrap user input in these templates based on Issue Type.

### **🐛 BUG TEMPLATE**

```markdown
_ENVIRONMENT:_
Browser: {browser}
OS: {os_info}

_STEPS TO REPRODUCE:_
[To be filled by SQA]

_EXPECTED RESULT:_
[To be filled by SQA]

_ACTUAL RESULT:_
[To be filled by SQA]

_SCOPE:_
[To be filled by SQA]

_PLEASE SEE (BEB LINK):_
{recording_link}

_(FOR SQA ONLY) WATCHERS:_
[To be filled by SQA]

_(FOR SQA ONLY) DEVELOPERS:_
[To be filled by SQA]

---

_USER PROVIDED INFORMATION:_
_Details:_ {details}
_Reporter:_ {email} (Relay App)
```

### **✨ STORY / FEATURE TEMPLATE**

```markdown
_PROBLEM DESCRIPTION:_
{problem_description}

_PROPOSED SOLUTION:_
{proposed_solution}

_SCOPE:_
{scope}

_ACCEPTANCE CRITERIA:_
{acceptance_criteria}

_PLEASE SEE:_
{recording_link}

---

_Reporter:_ {email} (Relay App)
```

### **📋 TASK TEMPLATE**

```markdown
_TASK DESCRIPTION:_
{task_description}

_NOTES:_
{notes}

_LINKS / TEMPLATES:_
{links}

---

_Reporter:_ {email} (Relay App)
```

---

## IMPLEMENTATION PLAN

### PART 1: BACKEND ROBUSTNESS & IDENTITY (jira_service.py)

- **Smart Template Builder**: Update `template_builder.py` with the 3 layouts above.
- **Auto-Summary**: Prepend `[Tool]` to all summaries (e.g., `[AI] Summary`).
- **Internal Reporter**: Query `activity_log` to return the real `relayReporter`.
- **Negative JQL**: Handle `!` prefix for exclusions.

### PART 2: UI & DYNAMIC FORMS (frontend)

#### [MODIFY] [CreateIssueModal.tsx]

- **Dynamic Fields**: Show different sets of required/optional fields per type:
  - **Bug**: Summary, Details, Priority, Recording Link.
  - **Story**: Summary, Problem Description, Proposed Solution, Acceptance Criteria (REQ), Scope.
  - **Task**: Summary, Task Description (REQ), Notes, Links, Priority.
- **Validation**: "Create" button is only enabled when all required fields for that type are filled.

#### [MODIFY] [IssueDetail.tsx]

- **Sequential Navigation**: Add `< Prev` and `Next >` + **J/K** shortcuts.
- **Read-Only Lockdown**: Remove dropdowns for Status/Priority.
- **Identity Display**: Show "Relay Reporter" in the sidebar.

#### [MODIFY] [FilterBar.tsx]

- **Mixed Filtering**: Add IS / IS NOT toggles to each category.

---

## TESTING CHECKLIST

- [ ] Story creation requires "Acceptance Criteria".
- [ ] Task creation requires "Task Description".
- [x] J/K keys navigate between tickets.
- [x] "IS NOT" filter excludes correctly.

---

# MISSION 15: Design System & Design Standardization

Standardize the visual language for Status and Priority across the entire application, and fix critical backend reporter lookup errors.

## PROBLEM

- **Visual Drift**: Statuses use different colors and casing between the filter bar, table, and detail view.
- **Incomplete Statuses**: The filter bar is missing several Jira-native statuses (e.g., DEPLOYED TO DEV, SANITY).
- **Aesthetic Regression**: The Priority column uses indicator bars instead of clear Icons + Labels as discussed.
- **[LEFT-OVER] Summary Prefix**: Summaries are not being prefixed with `[Tool]` (e.g., `[AI]`) during issue creation.
- **[LEFT-OVER] Comment Format**: Comment attribution is using a footer instead of the required `**Name (Relay):**\n\n body` format.
- **[LEFT-OVER] Reporter Visuals**: The `relayReporter` identity is being fetched but is not yet displayed in the frontend sidebar.
- **Backend Error**: Reporter lookup is currently failing due to an incorrect import path: `No module named 'api.database'`.

## SOLUTION

1.  **Master Status Mapping**: Create a centralized configuration that maps all 14 Jira statuses to uniform labels and colors.
2.  **Priority Column Overhaul**: Replace the indicator bars with sleek Icons + Text Labels for better readability.
3.  **Prefixing & Attribution**: Update backend services to enforce SOP-compliant summary prefixing and comment headers.
4.  **Identity Display**: Integrate the `relayReporter` data into the `IssueDetail.tsx` sidebar.
5.  **Reporter Lookup Fix**: Correct the database import path in `jira_service.py`.

---

## MASTER STATUS CONFIGURATION (Rich Aesthetics)

| Jira Status                  | Relay Display Label      | Visual Style (Color Path)  |
| :--------------------------- | :----------------------- | :------------------------- |
| **FOR SQA INVESTIGATION**    | For SQA Investigation    | 🟣 **Purple** (Discovery)  |
| **SQA INVESTIGATION**        | SQA Investigation        | 🟣 **Purple** (Discovery)  |
| **REOPENED**                 | Reopened                 | 🟠 **Orange** (Attention)  |
| **TO DO**                    | To Do                    | 🔵 **Sky** (Backlog)       |
| **SELECTED FOR DEVELOPMENT** | Selected for Development | 🔵 **Indigo** (Planned)    |
| **IN PROGRESS**              | In Progress              | 🔵 **Blue** (Active)       |
| **DEV COMPLETE**             | Dev Complete             | 💠 **Cyan** (Coded)        |
| **DEPLOYED TO DEV**          | Deployed To Dev          | 🧪 **Teal** (Testing)      |
| **QA**                       | QA                       | 🟡 **Yellow** (Validation) |
| **QA IN PROGRESS**           | QA In Progress           | 🟡 **Amber** (Audit)       |
| **QA PASSED**                | QA Passed                | 🟢 **Emerald** (Success)   |
| **SANITY**                   | Sanity                   | 🌸 **Rose** (Verification) |
| **DONE**                     | Done                     | 🟢 **Green** (Final)       |
| **CANCELLED**                | Cancelled                | 🔘 **Slate** (Archived)    |

---

## IMPLEMENTATION PLAN

### PART 1: SHARED CONFIGURATION (frontend/src/types/index.ts)

- Implement `STATUS_CONFIG` as the single source of truth for labels and colors.
- Implement `PRIORITY_CONFIG` for icons and colors.

### PART 2: UI UPDATES (frontend)

- **[MODIFY] [FilterBar.tsx]**: Populate dropdowns from the shared config.
- **[MODIFY] [IssueList.tsx]**: Use Icon + Label for Priority. Use shared config for Status badges.
- **[MODIFY] [IssueDetail.tsx]**: Update the static badges to match the standardized design.

### PART 3: BACKEND & DATA FIXES (backend)

- **[MODIFY] [jira_service.py]**:
  - Change `from ..database import get_db` to `from ..utils.database import get_db`.
  - Update `create_issue` to prefix summary with `[{tool}]`.
  - Update `add_comment` to use the `**{name} (Relay):**\n\n {comment}` format.

---

## TESTING CHECKLIST

- [ ] Every status in the table has a Title Case label and consistent vibrant color.
- [ ] Priority column shows Icons + Text (e.g., ⬆️ Highest).
- [ ] New Jira issues are created with `[Tool]` in the summary.
- [ ] New comments show the sender's name in bold as a header.
- [ ] "Relay Reporter" (Name + Email) is visible in the issue sidebar.

---

# MISSION 15: Post-Deployment Cleanup & Audit

Refine the frontend display to handle the new SOP-compliant comment headers and perform a final audit of all Mission 15 features.

## PROBLEM

- **Relay Comment Clutter**: Comments posted from Relay with the new Mission 15 header (`**Name (Relay):**\n\n`) are being displayed raw in the Relay frontend.
- **Source Misidentification**: These same comments are being tagged as "via Jira" in Relay because the frontend doesn't recognize the new Relay header pattern.

## SOLUTION

1.  **RegEx Comment Recognition**: Update `CommentList.tsx` to detect both the old footer pattern AND the new header pattern.
2.  **Clean Body Parsing**: Remove the SOP header from the displayed body in Relay to maintain a clean chat-like interface.
3.  **Accurate Tagging**: Ensure comments with the Relay header are correctly tagged as "via Relay".

## TESTING CHECKLIST

- [ ] Comments with `**Name (Relay):**` header are tagged as "via Relay" in the frontend.
- [ ] The header text itself is hidden from the comment body in the Relay UI.

---

# MISSION 16: Multi-Workspace Integration (Harry Botter)

Introduce a "Workspace" concept to allow side-by-side integration of Jira and secondary reporting tools (Harry Botter) with distinct visual identities.

## PROBLEM

- **Single-Tool Locking**: Relay is currently hardcoded for Jira workflows.
- **Visual Fragmentation**: Users have to leave Relay to use the Harry Botter portal.
- **Workspace Navigation**: No way to distinguish between different tools if multiple are integrated.

## SOLUTION

1.  **Workspace Switcher**: Implement a top-level context switcher to toggle between "Jira" and "Harry Botter".
2.  **Dynamic Theming**: Swap global CSS variables (Primary, Secondary, Accent) based on the active workspace.
3.  **Internal Embedding**: Use a full-view `<iframe>` to host the Harry Botter portal natively within Relay.
4.  **Contextual Layout**: Update the Sidebar and Navbar to respond to the active workspace.

---

## IMPLEMENTATION PLAN

### PART 1: WORKSPACE STATE (frontend)

- **WorkspaceContext**: Create a new context to manage `activeWorkspace` ('jira' | 'harry-botter').
- **Theme Provider**: Update the theme logic to switch between `relay-orange` (Jira) and `botter-blue` (Harry Botter) gradients.

### PART 2: UI & LAYOUT (frontend)

- **[MODIFY] [MainLayout.tsx]**:
  - Add the Workspace Switcher UI.
  - Implement conditional rendering: If 'harry-botter', render the `HarryBotterView` iframe.
- **[NEW] [HarryBotterView.tsx]**:
  - A dedicated component hosting the `https://harrybotter-portal.vercel.app/submit-ticket` iframe.
  - Handle loading states and full-height layout.

### PART 3: VISUAL IDENTITY (frontend)

- **Theme Mapping**:
  - **Jira**: Primary `#FF6B35` → `#F7931E` (Warm)
  - **Harry Botter**: Primary `#00D2FF` → `#3A7BD5` (Cool)
- **Contextual Icons**: Update the main logo/icon to reflect the current workspace.

---

## TESTING CHECKLIST

- [ ] Switching to "Harry Botter" instantly changes the application accent colors to Blue/Teal.
- [ ] The Harry Botter portal renders correctly within the iframe without security blocks.
- [ ] The global sidebar reflects the tools available for the specific workspace selected.
- [ ] Returning to "Jira" workspace restores the Orange theme and all Issue tracking features.
