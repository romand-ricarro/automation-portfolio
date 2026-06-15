# Staging Environment Infrastructure Specification

## 1. Context & Constraints

**Objective**: Configure the application to support a distinct "Staging" environment. This ensures the Vercel Preview deployments use a separate database and display a visual indicator to users.

## 1.5 The "Preview-as-Staging" Workflow

On Vercel, every push to a branch (other than `main`) or a Pull Request creates a unique **Preview Deployment**. We use these deployments as our **Staging Environment**.

1.  **Local Dev**: Developer works locally. `VITE_APP_ENV` is set to `development` or `staging`.
2.  **Feature Branch push**: Push code to GitHub.
3.  **Vercel Preview**: Vercel automatically builds the branch.
    - It sees it's a **Preview** scope.
    - It injects the **Staging DB URL**.
    - Relay detects this and shows the **Orange Banner**.
4.  **Verification**: Stakeholders test the feature on this Preview URL.
5.  **Merge to Main**: Code is merged. Vercel builds the **Production** site.
    - It uses the **Production DB**.
    - No banner is shown.

**Tech Stack**: Python (Flask), React (Vite), Turso (LibSQL).

**Builder Autonomy Level**: Low. Follow logic strictly.

**Constraints**:

- Do NOT modify the core Vercel build process.
- Do NOT add new npm packages.
- Rely on Environment Variables for switching logic.

---

## 2. Architecture & Data Model

### Environment Detection

- **Backend**: Detect environment via `VERCEL_ENV` (provided by Vercel) or implicit DB URL injection.
- **Frontend**: Detect via `import.meta.env.VITE_APP_ENV`.

### Data Flow

- If **Environment == preview** OR **development** -> Connect to Staging DB.
- If **Environment == production** -> Connect to Production DB.

### Security

- Ensure `TURSO_AUTH_TOKEN` is correctly retrieved for the respective environment (assumes Vercel handles variable scoping).

---

## 3. Implementation Plan (Atomic & Phased)

### Phase 0: Dashboard Configuration (Prerequisites)

**Goal**: Prepare the infrastructure to provide the necessary variables.

- **Turso**: Create a new database named `relay-tracker-staging`.
- **Vercel Settings**:
  - Enable "Automatically expose System Environment Variables".
  - Add `TURSO_DATABASE_URL` (Scoped to **Preview** and **Development**).
  - Add `TURSO_AUTH_TOKEN` (Scoped to **Preview** and **Development**).
  - Add `VITE_APP_ENV` = `staging` (Scoped to **Preview** and **Development**).
  - Add `DEV_BYPASS_AUTH` = `true` (Scoped to **Preview** only).
- **Google Cloud Console**:
  - Add `https://relay-git-staging.vercel.app` to Authorized Javascript Origins and Redirect URIs.
  - (Note: This assumes a fixed Vercel branch/alias for the primary staging environment).

### Phase 1: Backend Database Switching Logic

**Goal**: Ensure the backend connects to the correct database without code changes, relying on Vercel's Environment Variable scoping.

**Files to Modify**:

- `backend/api/utils/database.py` (DB Connection)
- `backend/api/index.py` (Startup logging)

**Logic**:

- Strictly rely on `os.environ.get("TURSO_DATABASE_URL")`.
- Add startup logging: `print(f"Relay Tracker: Starting in {os.environ.get('VERCEL_ENV', 'development')} mode")`.

### Phase 2: Frontend Staging Indicator

**Goal**: Display a visible "STAGING" banner when the app is not in production.

**Files to Modify**:

- `frontend/src/components/MainLayout.tsx`
- `frontend/vite.config.ts`

**Logic**:

- Read `const isStaging = import.meta.env.VITE_APP_ENV === 'staging'`.
- Conditional Render:

```tsx
{
  isStaging && (
    <div className="bg-amber-500 text-white text-xs font-bold text-center py-1 uppercase tracking-widest">
      ⚠️ Staging Environment - Data may be wiped
    </div>
  );
}
```

**TypeScript Support**:

- **File**: `frontend/src/vite-env.d.ts` (or create if missing)
- **Logic**: Add definition to prevent linter errors:

```typescript
interface ImportMetaEnv {
  readonly VITE_APP_ENV: string;
}
```

### Phase 3: CORS & Origin Hardening

**Goal**: Ensure dynamic Vercel Preview URLs are allowed by the backend CORS policy.

**Files to Modify**:

- `backend/api/index.py`

**Logic**:

- Allow dynamic Vercel URL:

```python
vercel_url = os.environ.get("VERCEL_URL")
if vercel_url:
    origins.append(f"https://{vercel_url}")
```

### Phase 4: Staging Auth Bypass (Mock Login)

**Goal**: Allow testing on dynamic preview URLs where Google OAuth cannot be easily configured.

**Files to Modify**:

- `frontend/src/context/AuthContext.tsx`

**Logic**:

- If `VITE_APP_ENV === 'staging'`, provide a "Mock Login" option.
- This creates a temporary session/token in `localStorage`.
- **Backend Sync**: The backend will accept this mock login because `DEV_BYPASS_AUTH` is set to `true` in the Preview scope.
- **Surgical Detail**: Ensure the `localStorage` token is set to exactly `dev-token-secret`. The backend `auth.py` is hardcoded to look for this specific string when `DEV_BYPASS_AUTH` is active.

---

## 4. Verification & Testing

### Manual Verification (Local)

- Set `VITE_APP_ENV=staging` in `frontend/.env`.
- Run frontend -> Verify Orange Banner.
- Run backend -> Check logs for "Starting in development mode".

### Success Scenarios

- **Production**: No banner, connects to Prod DB.
- **Preview/Staging**: Orange banner, connects to Staging DB.
