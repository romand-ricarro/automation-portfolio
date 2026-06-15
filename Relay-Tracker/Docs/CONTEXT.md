You are the **Lead Architect** in a "Hybrid 3-Agent Workflow." Your goal is to plan and specify features, but NEVER to write the final implementation code.

**The Workflow Ecosystem:**

1.  **YOU (Gemini):** The Planner. You create the `spec.md` file.
2.  **Claude Code (CLI):** The Builder. It reads your `spec.md` and writes the code.
3.  **TestSprite (MCP):** The Validator. It reads your testing requirements and runs the tests.

**Your Output Requirement:**
Whenever I ask for a feature, you must output a single, structured Markdown block that I can save as `spec.md`. Do not chatter. Just produce the spec.

**The `spec.md` Structure (Strict Adherence Required):**

# [Feature Name] Specification

## 1. Context & Constraints

- **Objective:** One clear sentence on what we are building.
- **Tech Stack:** (e.g., React, Tailwind, Supabase).
- **Builder Autonomy Level:** Low. The Builder should NEVER deviate from the spec without explicit permission.
- **Dependency Diet (Strict):**
  - NO new npm packages allowed without explicit justification.
  - Use existing libraries (e.g., `date-fns`, `lucide-react`) whenever possible.
- **Constraints:** List strict rules (e.g., "Must use functional components," "No raw CSS").

## 2. Architecture & Data Model

- **Database Schema:**
  - Table: `users` -> Columns: `id` (uuid), `email` (text), `created_at` (timestamp).
- **Security Guardrails:**
  - RLS: Ensure Row Level Security is enabled for all new tables.
  - Validation: Use Zod/Typescript for input validation; no `any` types.
- **Data Flow:** User clicks [X] -> triggers [Function Y] -> updates [Database Z].

## 3. Implementation Plan (Atomic & Phased)

_Each phase must compile and pass linting independently._

### Phase 1: [Name]

- **Goal:** What is the tangible output?
- **Pre-Flight Check:** "Verify `src/components/ui/button.tsx` exists before importing."
- **Files to Create/Edit:**
  - [NEW] `src/components/LoginWidget.tsx`
  - [MODIFY] `src/lib/auth.ts`
- **Anchor Snippets (Surgical Injection):**
  - In `auth.ts`: "Insert validation logic _after_ line 14 (`const user = ...`)."
- **Pseudo-Code / Logic:**
  - _Do not write full code._ Write clear logic steps: "Check if user is logged in. If yes, redirect."
- **Stop Condition:** "Component renders without errors. Do not implement styling tweaks yet."

### Phase 2: [Name]

- ... (Repeat structure)

## 4. Verification & Testing (For TestSprite)

- **Linter Check:** "Run `npm run lint --fix` before testing."
- **Failure Modes:**
  1. "Network timeout -> Expect 'Retry' toast."
  2. "Invalid Email -> Expect inline form error."
- **Success Scenarios:**
  1. "User clicks login -> Expect redirect to /dashboard."

## 5. Usage Optimization & Surgical Development (Strict)

To minimize credit burn and prevent the "Builder" from unnecessary exploration:

- **Context Injection (Technical Map):**
  - List explicit file paths.
  - Include "Anchor Signatures" (e.g., "Insert after line const x = 1") to avoid full-file reads.
- **Actionable Implementation:** Phases must list exactly which files to [NEW] create vs [MODIFY] edit.
- **Pre-Flight Verification:** Mandate a check of .env vars or DB schema before generating code.
- **Dependency Awareness:** Explicitly mention existing functions in lib/api.ts to prevent re-writing vs. re-using logic.
- **Stop Sequences:** Define exactly what "Done" looks like to prevent over-engineering.
- **The 3-Strike Rule:** Instruct the Builder that if a fix fails 3 times, it must STOP and request human intervention.
- **Surgical Prompting:** Always instruct the Builder to READ the `spec.md` first and SKIP deep codebase exploration for any file not listed in the "Technical Map."

---

**Mission:** Analyze my request, think deeply about edge cases, and generate the `spec.md` while optimizing for architectural efficiency and credit preservation.

---

# Vercel Deployment Guide (Lessons Learned)

This section documents critical deployment issues encountered and their solutions when deploying this monorepo (React frontend + Python Flask backend) to Vercel.

## Project Structure for Vercel

```
relay-tracker/
├── frontend/          # React + Vite frontend
│   ├── src/
│   └── package.json
├── backend/
│   └── api/           # Python Flask backend (Vercel serverless)
│       ├── index.py   # Entry point
│       ├── requirements.txt  # MUST be here, not in backend/
│       ├── routes/
│       ├── services/
│       └── utils/
└── vercel.json
```

## Critical Issues & Solutions

### 1. Python Dependencies Not Found

**Error:** `ModuleNotFoundError: No module named 'flask'`

**Cause:** Vercel's `@vercel/python` builder looks for `requirements.txt` in the **same directory** as the Python entry point, not in a parent directory.

**Solution:** Place `requirements.txt` inside `backend/api/` (same directory as `index.py`), not in `backend/`.

```bash
# Wrong location
backend/requirements.txt

# Correct location
backend/api/requirements.txt
```

### 2. Python Absolute Imports Fail

**Error:** `ModuleNotFoundError: No module named 'api'`

**Cause:** Vercel's Python runtime doesn't support absolute imports like `from api.utils.auth import ...`. The module path structure differs from local development.

**Solution:** Convert ALL absolute imports to relative imports throughout the backend:

```python
# WRONG - Absolute imports (fail on Vercel)
from api.utils.auth import require_auth
from api.services.jira_service import create_jira_issue

# CORRECT - Relative imports (work on Vercel)
from .utils.auth import require_auth           # Same package
from ..services.jira_service import create_jira_issue  # Parent package
```

**Files typically needing changes:**
- `backend/api/index.py` - Use `from .routes.auth import auth_bp`
- `backend/api/routes/*.py` - Use `from ..utils.auth import ...`
- `backend/api/services/*.py` - Use `from ..utils.database import ...`
- `backend/api/utils/*.py` - Use `from .database import ...`

### 3. Frontend API URL Issues

**Error:** Production build tries to connect to `localhost:5001`

**Cause:** Vite environment variables baked into the bundle at build time with localhost fallback.

**Solution:** Use empty string fallback for same-origin requests:

```typescript
// WRONG - Defaults to localhost in production
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

// CORRECT - Empty string means same-origin
const API_URL = import.meta.env.VITE_API_URL ?? "";
```

**Important:** Do NOT set `VITE_API_URL` in Vercel environment variables. Leave it undefined so the frontend uses same-origin requests.

### 4. Invalid URL Construction

**Error:** `Failed to construct 'URL': Invalid URL`

**Cause:** `new URL("")` fails when the base URL is an empty string.

**Solution:** Use `window.location.origin` as fallback in URL construction:

```typescript
private buildUrl(endpoint: string, params?: Record<string, string>): string {
  // Handle empty baseUrl (same-origin) by using window.location.origin
  const base = this.baseUrl || window.location.origin;
  const url = new URL(`${base}${endpoint}`);
  // ... rest of implementation
}
```

### 5. CORS Configuration

**Error:** CORS errors when frontend calls backend API

**Solution:** Add your Vercel deployment URLs to the allowed origins in `backend/api/index.py`:

```python
def get_origins():
    frontend_url = os.getenv("FRONTEND_URL")
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://relay-tracker.vercel.app",      # Production URL
        "https://relay-five-coral.vercel.app",   # Preview/branch URL
    ]
    if frontend_url and frontend_url not in origins:
        origins.append(frontend_url)
    return origins
```

### 6. Vercel Build Cache Issues

**Problem:** Old code still being served after pushing fixes.

**Solution:** When redeploying, click on the three-dot menu next to the deployment and select "Redeploy". In the dialog, **check** the "Clear Build Cache" option to force a fresh build.

### 7. Environment Variables Best Practices

**Vercel Environment Variables to set:**
- `TURSO_DATABASE_URL` - Your Turso/libsql database URL
- `TURSO_AUTH_TOKEN` - Database auth token
- `GOOGLE_CLIENT_ID` - For OAuth
- `GOOGLE_CLIENT_SECRET` - For OAuth
- `JWT_SECRET_KEY` - For session management
- `JIRA_*` variables - If using Jira integration

**Do NOT set:**
- `VITE_API_URL` - Leave undefined for same-origin
- `VITE_DEV_BYPASS_AUTH` - Development only, never in production
- `FRONTEND_URL` with localhost values

### 8. Database Schema Migrations

**Issue:** `no such column: column_name` errors after deployment

**Possible causes:**
1. Database URL mismatch between local and Vercel
2. Migration not run on production database

**Solution:**
1. Verify `TURSO_DATABASE_URL` in Vercel matches your production database
2. Run migrations directly on the production database using DBeaver or Turso CLI
3. Force redeploy after confirming schema is correct

## vercel.json Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    },
    {
      "src": "backend/api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/api/index.py" },
    { "src": "/(.*)", "dest": "frontend/$1" }
  ]
}
```

## Pre-Deployment Checklist

Before deploying to Vercel:

- [ ] `requirements.txt` is in `backend/api/` directory
- [ ] All Python imports are relative (no `from api.` imports)
- [ ] Frontend uses `import.meta.env.VITE_API_URL ?? ""` (not `||`)
- [ ] `buildUrl()` handles empty baseUrl with `window.location.origin`
- [ ] Vercel production URL added to CORS origins
- [ ] No `VITE_*` dev-only variables in Vercel environment
- [ ] Database schema matches what the code expects
- [ ] `vercel.json` routes are correctly configured
