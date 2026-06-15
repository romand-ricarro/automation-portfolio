# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InsightPulse - A full-stack web application for analyzing training survey data using AI. The platform pulls data from Google Sheets (Google Forms responses), uses OpenAI GPT-4o to analyze open-ended feedback, and identifies common issues and patterns across sessions.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + React Router
- **Backend**: Flask (Python 3.9+) + SQLAlchemy + PostgreSQL (Supabase)
- **Authentication**: Supabase Auth (JWT tokens)
- **External APIs**: OpenAI API (GPT-4o), Google Sheets API (gspread)
- **Deployment**: Vercel (frontend & serverless backend)

## Development Commands

### Backend (from `/backend/`)
```bash
# Install dependencies
pip install -r requirements.txt

# Run development server (port 8000)
flask run

# Run with debug mode
python app.py

# Database migrations (using Flask-Migrate)
flask db migrate -m "migration message"
flask db upgrade
```

### Frontend (from `/frontend/`)
```bash
# Install dependencies
npm install

# Run development server (port 5173)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Backend Structure

The backend follows a modular Flask blueprint architecture:

- **`app.py`**: Application factory pattern with `create_app()`. Registers all blueprints and initializes database.
- **`models/database.py`**: SQLAlchemy models defining the core data structure:
  - `User`: Authentication and role-based access (admin/facilitator/viewer)
  - `Session`: Training sessions with metadata (session_id, date, facilitator, status)
  - `QuestionAnalysis`: AI-generated analysis for each survey question
  - `CommonIssue`: Aggregated themes across all questions in a session
  - `ActionItem`: Trackable follow-up actions with status, priority, assignee
  - `SessionRating`: Numerical ratings for 9 metrics (repeatability, quality, etc.)

- **`api/` blueprints**:
  - `sessions.py`: CRUD for sessions, fetch from Google Sheets, trigger AI analysis
  - `analyses.py`: Retrieve question analyses and common issues
  - `action_items.py`: Manage action items (create, update, delete)
  - `users.py`: User management and role updates
  - `dashboard.py`: Aggregate statistics and recent activity

- **`services/` layer**:
  - `auth_service.py`: JWT token validation via Supabase, `@require_auth` and `@require_role` decorators
  - `google_sheets_service.py`: Fetches 18-column survey data using gspread service account
  - `openai_service.py`: Two-step AI analysis:
    1. `analyze_question()`: Analyzes individual open-ended questions
    2. `generate_common_issues_table()`: Synthesizes all analyses into common issues

### Frontend Structure

- **`App.tsx`**: Main router with protected routes (uses `PrivateRoute` wrapper)
- **`contexts/`**:
  - `AuthContext.tsx`: Manages Supabase auth state, user session, and JWT tokens
  - `ThemeContext.tsx`: Dark mode toggle state

- **`components/` organized by feature**:
  - `auth/`: Login component
  - `common/`: Reusable UI (Layout, Navbar, Sidebar, LoadingSpinner, DarkModeToggle)
  - `dashboard/`: Dashboard with key metrics and recent sessions
  - `sessions/`: SessionList and SessionDetail (includes analyses display)
  - `analyses/`: QuestionAnalyses and CommonIssuesTable components
  - `actionItems/`: ActionItemsList and ActionItemForm
  - `reports/`: Reports view

- **API Communication**: Uses axios with base URL from environment variables. All requests include Authorization header with Supabase JWT token.

### Data Flow for AI Analysis

1. User provides Google Sheets spreadsheet ID in frontend
2. Backend fetches raw survey responses via Google Sheets API
3. Session created/updated in database with metadata (session_id, date, facilitator, num_responses)
4. For each open-ended question (learned, apply, need_to_learn, comments):
   - OpenAI analyzes responses using `analyze_question()` → creates `QuestionAnalysis` record
5. All question analyses combined via `generate_common_issues_table()` → creates `CommonIssue` records
6. Numerical ratings averaged and stored in `SessionRating`
7. Frontend displays analyses, common issues table, and metrics

### Authentication Flow

1. User logs in via Supabase Auth in frontend
2. Supabase returns JWT token stored in AuthContext
3. All API requests include `Authorization: Bearer <token>` header
4. Backend `@require_auth` decorator validates token with Supabase
5. User synced to local database on first login (first user = admin, others = viewer)
6. Current user stored in Flask's `g` object for route access

### Role-Based Access

- **Admin**: Full CRUD on all resources, can update user roles
- **Facilitator**: Create/edit sessions and action items
- **Viewer**: Read-only access to sessions and analyses

## Environment Variables

### Backend (`.env` in `/backend/`)
- `DATABASE_URL`: PostgreSQL connection string (Supabase)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `OPENAI_API_KEY`: OpenAI API key
- `GOOGLE_SHEETS_CREDENTIALS`: JSON string of Google service account credentials
- `FLASK_SECRET_KEY`: Flask session secret
- `FRONTEND_URL`: Frontend origin for CORS (default: http://localhost:5173)

### Frontend (`.env` in `/frontend/`)
- `VITE_API_URL`: Backend API base URL (default: http://localhost:8000/api)
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key

## Key Implementation Details

- **Google Sheets Schema**: The service expects exactly 18 columns in a specific order (timestamp, email, session_date, session_id, facilitator_name, 4 open-ended questions, 9 rating questions, 1 comments field). Column mapping is hardcoded in `google_sheets_service.py:50-74`.

- **Session ID Format**: Sessions use both a UUID primary key (`id`) and a human-readable `session_id` (e.g., "GBLr335E") extracted from Google Sheets.

- **AI Model**: Currently uses `gpt-4o` (not GPT-5.2 as mentioned in README). The model can be changed in `openai_service.py:12`.

- **Retry Logic**: OpenAI API calls have exponential backoff retry logic (max 3 attempts).

- **CORS**: Backend configured to accept requests from `FRONTEND_URL` origin only. Supports credentials for cookie-based sessions if needed.

- **Database Migrations**: Uses Flask-Migrate for schema changes. Migration files stored in `backend/migrations/`.

## Common Development Workflows

### Adding a new database model field
1. Update the model class in `backend/models/database.py`
2. Add the field to the `to_dict()` method
3. Run `flask db migrate -m "description"`
4. Run `flask db upgrade`
5. Update corresponding API endpoints and frontend TypeScript types

### Adding a new API endpoint
1. Add route to appropriate blueprint in `backend/api/`
2. Add `@require_auth` decorator (and `@require_role` if needed)
3. Handle OPTIONS method for CORS preflight
4. Update frontend API service to call new endpoint
5. Update TypeScript types in `frontend/src/types/index.ts`

### Modifying AI analysis prompts
- Edit prompt templates in `backend/services/openai_service.py`
- The two main prompts are in `analyze_question()` and `generate_common_issues_table()`
- Test changes with sample survey data before deploying

## Testing

- Backend: Uses pytest (see `backend/requirements.txt`). No test files currently in repo.
- Frontend: No test configuration present. ESLint configured for code quality.

## Deployment Notes

- Frontend and backend both deploy to Vercel
- Backend runs as serverless functions
- Database hosted on Supabase (PostgreSQL)
- Environment variables must be configured in Vercel dashboard
- See `docs/DEPLOYMENT.md` for detailed deployment instructions
