# Mission Alpha: Foundation & Reliability

## Mission Overview

**Codename**: Alpha  
**Phase**: Testing/Staging  
**Duration**: ~1 week  
**Priority**: CRITICAL — Must complete before any feature work

Mission Alpha establishes the reliability and observability foundation for InsightPulse. Currently, the application has no error tracking, minimal input validation, and no automated tests. This creates significant risk when deploying changes and makes debugging production issues extremely difficult.

This mission creates the "safety net" that enables all future development.

---

## Current State & Problems

### 1. No Error Visibility

- Errors in production are invisible unless users report them
- No stack traces, no error aggregation, no alerting
- OpenAI API failures or Google Sheets issues go unnoticed
- Debugging requires manual log inspection on Vercel

### 2. Missing Input Validation

- API endpoints accept any input without validation
- Invalid Google Sheets IDs cause cryptic errors
- No schema validation for request bodies
- Potential for XSS if user content is rendered unsanitized

### 3. No Rate Limiting

- Any client can spam API endpoints
- OpenAI-intensive endpoints are vulnerable to abuse
- No protection against accidental infinite loops in frontend

### 4. Zero Test Coverage

- No backend unit tests exist (noted in CLAUDE.md: "No test files currently in repo")
- No frontend component tests
- Refactoring is risky without test coverage
- New developers can't verify their changes work

---

## Detailed Requirements

### Task 1: Error Logging & Monitoring (Sentry Integration)

#### Backend Requirements

1. **Install and configure Sentry SDK for Flask**
   - Add `sentry-sdk[flask]` to `backend/requirements.txt`
   - Initialize Sentry in `backend/app.py` within the `create_app()` function
   - Use environment variable `SENTRY_DSN` for configuration
   - Set environment tag to distinguish staging vs production

2. **Capture context with errors**
   - Attach current user ID (from `g.current_user`) to Sentry scope
   - Include request body (sanitized — remove sensitive fields like tokens)
   - Add custom tags: `endpoint`, `http_method`, `session_id` (if applicable)

3. **Structured logging**
   - Replace any `print()` statements with proper Python `logging`
   - Log levels: DEBUG for verbose, INFO for operations, ERROR for failures
   - Include correlation ID in logs (generate UUID per request)
   - Add logging for: API request/response, OpenAI calls, Google Sheets fetches

4. **Alert configuration (in Sentry dashboard, document for user)**
   - Alert on: Error rate spike >5 errors/minute
   - Alert on: New unhandled exception types
   - Slack/email integration (document setup steps)

#### Frontend Requirements

1. **Install and configure Sentry SDK for React**
   - Add `@sentry/react` to `frontend/package.json`
   - Initialize in `frontend/src/main.tsx` before React render
   - Use environment variable `VITE_SENTRY_DSN`

2. **Error boundary integration**
   - Wrap `App` component with Sentry error boundary
   - Show user-friendly error page when React crashes
   - Capture component stack traces

3. **Track specific events**
   - Capture failed API calls (axios interceptor)
   - Track long-running operations (analysis taking >30s)

#### Files to Modify/Create

| File                                               | Action | Description                         |
| -------------------------------------------------- | ------ | ----------------------------------- |
| `backend/requirements.txt`                         | MODIFY | Add `sentry-sdk[flask]>=2.0.0`      |
| `backend/app.py`                                   | MODIFY | Initialize Sentry in `create_app()` |
| `backend/utils/logging.py`                         | CREATE | Centralized logging configuration   |
| `backend/.env.example`                             | MODIFY | Add `SENTRY_DSN` placeholder        |
| `frontend/package.json`                            | MODIFY | Add `@sentry/react` dependency      |
| `frontend/src/main.tsx`                            | MODIFY | Initialize Sentry before app render |
| `frontend/src/components/common/ErrorBoundary.tsx` | CREATE | Error boundary component            |
| `frontend/.env.example`                            | CREATE | Add `VITE_SENTRY_DSN` placeholder   |

---

### Task 2: Input Validation & Sanitization

#### Backend Requirements

1. **Install validation library**
   - Add `marshmallow>=3.20.0` to requirements for schema validation
   - Alternative: Use `pydantic` if preferred (but marshmallow aligns with Flask ecosystem)

2. **Create validation schemas for each endpoint**

   **Sessions API** (`backend/api/sessions.py`):

   ```
   POST /api/sessions/import
   - spreadsheet_id: required, string, must match Google Sheets ID format (alphanumeric, ~44 chars)
   - sheet_name: optional, string, max 100 chars

   PUT /api/sessions/<id>
   - status: optional, enum["pending", "analyzing", "completed", "error"]
   - facilitator_name: optional, string, max 200 chars
   ```

   **Action Items API** (`backend/api/action_items.py`):

   ```
   POST /api/action-items
   - title: required, string, 1-500 chars
   - description: optional, string, max 2000 chars
   - session_id: required, valid UUID
   - priority: optional, enum["low", "medium", "high"]
   - assignee: optional, string, max 200 chars
   - due_date: optional, ISO date string

   PUT /api/action-items/<id>
   - Same fields as POST, all optional
   - status: optional, enum["open", "in_progress", "completed"]
   ```

   **Users API** (`backend/api/users.py`):

   ```
   PUT /api/users/<id>/role
   - role: required, enum["admin", "facilitator", "viewer"]
   ```

3. **Validation error handling**
   - Return 400 Bad Request with structured error response:
     ```json
     {
       "error": "Validation failed",
       "details": {
         "spreadsheet_id": ["Invalid format. Expected Google Sheets ID."],
         "title": ["Field is required."]
       }
     }
     ```
   - Log validation failures (INFO level, not ERROR)

4. **Sanitization for displayed content**
   - Escape HTML in any user-provided text before storing (or on output)
   - Specifically: action item titles, descriptions, facilitator names
   - Use `markupsafe.escape()` or similar

5. **Google Sheets ID validation**
   - Before calling Google Sheets API, validate ID format
   - Catch and handle "spreadsheet not found" gracefully
   - Return user-friendly error: "Could not access spreadsheet. Please check the ID and sharing permissions."

#### Files to Modify/Create

| File                                     | Action     | Description                                |
| ---------------------------------------- | ---------- | ------------------------------------------ |
| `backend/requirements.txt`               | MODIFY     | Add `marshmallow>=3.20.0`                  |
| `backend/schemas/`                       | CREATE DIR | Directory for validation schemas           |
| `backend/schemas/__init__.py`            | CREATE     | Package init                               |
| `backend/schemas/session_schemas.py`     | CREATE     | Session-related schemas                    |
| `backend/schemas/action_item_schemas.py` | CREATE     | Action item schemas                        |
| `backend/schemas/user_schemas.py`        | CREATE     | User role update schema                    |
| `backend/api/sessions.py`                | MODIFY     | Add validation to endpoints                |
| `backend/api/action_items.py`            | MODIFY     | Add validation to endpoints                |
| `backend/api/users.py`                   | MODIFY     | Add validation to endpoints                |
| `backend/utils/validators.py`            | CREATE     | Custom validators (e.g., Google Sheets ID) |

---

### Task 3: API Rate Limiting

#### Requirements

1. **Install Flask-Limiter**
   - Add `Flask-Limiter>=3.5.0` to requirements
   - Use in-memory storage for simplicity (sufficient for Vercel serverless)
   - Note: For horizontal scaling, would need Redis (out of scope for Alpha)

2. **Configure rate limits by endpoint category**

   | Endpoint Pattern               | Limit     | Rationale                              |
   | ------------------------------ | --------- | -------------------------------------- |
   | `POST /api/sessions/import`    | 5/minute  | Expensive (Google Sheets + OpenAI)     |
   | `POST /api/sessions/*/analyze` | 3/minute  | Very expensive (multiple OpenAI calls) |
   | `GET /api/*`                   | 60/minute | Read operations, lighter               |
   | `POST/PUT/DELETE /api/*`       | 30/minute | Write operations                       |
   | Auth endpoints                 | 10/minute | Prevent brute force                    |

3. **Rate limit response**
   - Return 429 Too Many Requests
   - Include `Retry-After` header
   - Body: `{"error": "Rate limit exceeded", "retry_after": 60}`

4. **Exempt authenticated admins** (optional)
   - Admins may need higher limits for bulk operations
   - Use decorator to check role before applying limit

5. **Logging**
   - Log rate limit hits (WARN level)
   - Include IP, user ID (if authenticated), endpoint

#### Files to Modify/Create

| File                            | Action | Description                          |
| ------------------------------- | ------ | ------------------------------------ |
| `backend/requirements.txt`      | MODIFY | Add `Flask-Limiter>=3.5.0`           |
| `backend/app.py`                | MODIFY | Initialize Limiter in `create_app()` |
| `backend/utils/rate_limiter.py` | CREATE | Limiter configuration and decorators |
| `backend/api/sessions.py`       | MODIFY | Apply rate limits                    |
| `backend/api/action_items.py`   | MODIFY | Apply rate limits                    |
| `backend/api/users.py`          | MODIFY | Apply rate limits                    |
| `backend/api/dashboard.py`      | MODIFY | Apply rate limits                    |
| `backend/api/analyses.py`       | MODIFY | Apply rate limits                    |

---

### Task 4: Backend Unit Tests

#### Requirements

1. **Test framework setup**
   - Use `pytest` (already in requirements.txt)
   - Add `pytest-cov` for coverage reporting
   - Add `pytest-mock` for mocking external services
   - Create `backend/tests/conftest.py` with fixtures

2. **Test fixtures needed**
   - `app`: Flask test client with test configuration
   - `db`: Fresh database for each test (use SQLite in-memory)
   - `mock_supabase`: Mock Supabase auth responses
   - `mock_openai`: Mock OpenAI API responses
   - `mock_gsheets`: Mock Google Sheets responses
   - `sample_user`: Authenticated user fixture
   - `sample_session`: Session with test data

3. **Test coverage targets**

   **API Layer Tests** (`backend/tests/api/`):
   - `test_sessions.py`: Import, list, get, analyze endpoints
   - `test_action_items.py`: CRUD operations
   - `test_users.py`: Role updates, list users
   - `test_dashboard.py`: Stats endpoint
   - `test_analyses.py`: Get analyses for session

   **Service Layer Tests** (`backend/tests/services/`):
   - `test_auth_service.py`: Token validation, role checks
   - `test_openai_service.py`: Analyze question, generate issues (mocked)
   - `test_google_sheets_service.py`: Data parsing, error handling

   **Model Tests** (`backend/tests/models/`):
   - `test_database.py`: Model creation, relationships, `to_dict()`

4. **Test scenarios to cover**
   - Happy path for each endpoint
   - Authentication failures (missing token, invalid token, expired)
   - Authorization failures (viewer trying admin action)
   - Validation failures (bad input)
   - External service failures (OpenAI error, Sheets not found)
   - Edge cases (empty responses, special characters)

5. **Coverage requirements**
   - Minimum 80% line coverage for `backend/api/`
   - Minimum 70% line coverage for `backend/services/`
   - Generate HTML coverage report

6. **CI integration notes** (for future)
   - Tests should run in <60 seconds
   - No real API calls (all mocked)
   - Exit with non-zero on failure

#### Files to Modify/Create

| File                                                   | Action        | Description                     |
| ------------------------------------------------------ | ------------- | ------------------------------- |
| `backend/requirements.txt`                             | MODIFY        | Add `pytest-cov`, `pytest-mock` |
| `backend/pytest.ini`                                   | CREATE        | Pytest configuration            |
| `backend/tests/conftest.py`                            | MODIFY/CREATE | Shared fixtures                 |
| `backend/tests/__init__.py`                            | CREATE        | Package init                    |
| `backend/tests/api/__init__.py`                        | CREATE        | Package init                    |
| `backend/tests/api/test_sessions.py`                   | CREATE        | Session endpoint tests          |
| `backend/tests/api/test_action_items.py`               | CREATE        | Action item tests               |
| `backend/tests/api/test_users.py`                      | CREATE        | User endpoint tests             |
| `backend/tests/api/test_dashboard.py`                  | CREATE        | Dashboard tests                 |
| `backend/tests/api/test_analyses.py`                   | CREATE        | Analyses tests                  |
| `backend/tests/services/__init__.py`                   | CREATE        | Package init                    |
| `backend/tests/services/test_auth_service.py`          | CREATE        | Auth tests                      |
| `backend/tests/services/test_openai_service.py`        | CREATE        | OpenAI tests                    |
| `backend/tests/services/test_google_sheets_service.py` | CREATE        | Sheets tests                    |
| `backend/tests/models/__init__.py`                     | CREATE        | Package init                    |
| `backend/tests/models/test_database.py`                | CREATE        | Model tests                     |

---

## Acceptance Criteria

| Criteria                                                   | Verification                                          |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| Sentry captures backend errors with user context           | Trigger intentional error, verify in Sentry dashboard |
| Sentry captures frontend errors with component stack       | Trigger React error, verify in Sentry                 |
| All API endpoints validate input and return 400 on invalid | Send malformed requests, verify 400 responses         |
| Invalid Google Sheets ID returns user-friendly error       | Test with fake ID, verify message                     |
| Rate limiting returns 429 when exceeded                    | Script rapid requests, verify 429                     |
| `pytest` runs successfully with 80%+ coverage on API layer | Run `pytest --cov=api --cov-report=html`              |
| All tests pass without external API calls                  | Run tests in offline mode                             |

---

## Environment Variables Added

| Variable          | Location        | Description                           |
| ----------------- | --------------- | ------------------------------------- |
| `SENTRY_DSN`      | Backend `.env`  | Sentry project DSN for error tracking |
| `VITE_SENTRY_DSN` | Frontend `.env` | Sentry project DSN for frontend       |

---

## Dependencies Added

### Backend (`requirements.txt`)

```
sentry-sdk[flask]>=2.0.0
marshmallow>=3.20.0
Flask-Limiter>=3.5.0
pytest-cov>=4.1.0
pytest-mock>=3.12.0
```

### Frontend (`package.json`)

```json
{
  "dependencies": {
    "@sentry/react": "^8.0.0"
  }
}
```

---

## Testing Commands

```bash
# Run all backend tests
cd backend
pytest

# Run with coverage report
pytest --cov=api --cov=services --cov=models --cov-report=html

# Run specific test file
pytest tests/api/test_sessions.py -v

# Run tests matching pattern
pytest -k "test_validation" -v
```

---

## Deployment Notes

1. **Before deploying to staging**:
   - Create Sentry project (Flask for backend, React for frontend)
   - Add `SENTRY_DSN` to Vercel environment variables
   - Add `VITE_SENTRY_DSN` to Vercel environment variables

2. **Staging validation**:
   - Trigger intentional errors to verify Sentry connection
   - Test rate limiting with rapid requests
   - Run integration tests against staging

3. **Do NOT deploy to production** until all acceptance criteria pass in staging.
