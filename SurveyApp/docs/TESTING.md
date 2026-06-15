# Testing Documentation

This document provides comprehensive information about testing InsightPulse.

## Table of Contents

1. [Overview](#overview)
2. [Backend Testing](#backend-testing)
3. [Frontend Testing](#frontend-testing)
4. [Running Tests](#running-tests)
5. [Test Coverage](#test-coverage)
6. [Writing New Tests](#writing-new-tests)
7. [Continuous Integration](#continuous-integration)

## Overview

InsightPulse uses a comprehensive testing strategy covering both backend and frontend:

- **Backend**: pytest with Flask test client and mocking
- **Frontend**: Vitest with React Testing Library
- **Coverage**: pytest-cov (backend) and @vitest/coverage-v8 (frontend)

### Test Philosophy

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints and data flow
- **Component Tests**: Test React components with user interactions
- **Mocking**: Mock external dependencies (Supabase, OpenAI, Google Sheets)

## Backend Testing

### Test Structure

```
backend/
├── tests/
│   ├── conftest.py          # Pytest fixtures and configuration
│   ├── test_api.py          # Basic API tests (legacy)
│   ├── test_complete_api.py # Comprehensive API endpoint tests
│   └── test_services.py     # Service layer tests
```

### Test Coverage

#### API Endpoints Tested

**Sessions API** (`/api/sessions`)
- ✅ List all sessions (authenticated)
- ✅ Get session detail
- ✅ Update session (admin only)
- ✅ Import from Google Sheets (admin only)
- ✅ Run AI analysis (admin only)
- ✅ Authorization and role-based access

**Action Items API** (`/api/action-items`)
- ✅ List action items with filters
- ✅ Create action item (facilitator+)
- ✅ Update action item (facilitator+)
- ✅ Delete action item (facilitator+)
- ✅ Field validation
- ✅ Role-based access control

**Analyses API** (`/api/sessions/<id>/...`)
- ✅ Get question analyses
- ✅ Get common issues
- ✅ Get session ratings

**Dashboard API** (`/api/dashboard`)
- ✅ Get dashboard statistics
- ✅ Get facilitator performance data

**Users API** (`/api/users`)
- ✅ List users (admin only)
- ✅ Update user role (admin only)
- ✅ Get current user profile

#### Service Layer Tested

**Auth Service** (`services/auth_service.py`)
- ✅ Token validation with Supabase
- ✅ User authentication
- ✅ Role-based access control
- ✅ Error handling for invalid tokens

**OpenAI Service** (`services/openai_service.py`)
- ✅ Question analysis
- ✅ Common issues table generation
- ✅ Retry logic on API errors
- ✅ Empty response handling

**Google Sheets Service** (`services/google_sheets_service.py`)
- ✅ Fetch survey responses
- ✅ Handle empty sheets
- ✅ Handle API errors
- ✅ Handle malformed data

#### Database Models Tested

- ✅ User.to_dict()
- ✅ Session.to_dict()
- ✅ ActionItem.to_dict()
- ✅ SessionRating.to_dict()

### Running Backend Tests

```bash
cd backend

# Install test dependencies
pip install -r requirements.txt

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_complete_api.py

# Run specific test class
pytest tests/test_complete_api.py::TestSessionsAPI

# Run specific test
pytest tests/test_complete_api.py::TestSessionsAPI::test_list_sessions_success

# Run with coverage report
pytest --cov=. --cov-report=html --cov-report=term

# View coverage report
open htmlcov/index.html
```

### Backend Test Configuration

Tests use an in-memory SQLite database for isolation. Configuration in `conftest.py`:

```python
@pytest.fixture
def app():
    app = create_app({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': 'sqlite:///:memory:',
    })
    # ...
```

## Frontend Testing

### Test Structure

```
frontend/src/
├── test/
│   ├── setup.ts                           # Test setup and configuration
│   └── utils.tsx                          # Test utilities and custom render
├── components/
│   ├── dashboard/__tests__/
│   │   └── Dashboard.test.tsx
│   ├── sessions/__tests__/
│   │   └── SessionList.test.tsx
│   ├── actionItems/__tests__/
│   │   └── ActionItemForm.test.tsx
│   └── auth/__tests__/
│       └── Login.test.tsx
```

### Test Coverage

#### Components Tested

**Dashboard Component**
- ✅ Renders dashboard heading
- ✅ Shows loading state
- ✅ Displays statistics when loaded
- ✅ Handles API errors
- ✅ Displays recent sessions

**SessionList Component**
- ✅ Renders session list
- ✅ Shows loading state
- ✅ Displays sessions from API
- ✅ Shows status badges
- ✅ Filters sessions by search
- ✅ Handles empty list
- ✅ Handles API errors
- ✅ Navigation to detail view

**ActionItemForm Component**
- ✅ Renders all form fields
- ✅ Validates required fields
- ✅ Submits with valid data
- ✅ Handles API errors
- ✅ Cancel functionality
- ✅ Populates form when editing

**Login Component**
- ✅ Renders login form
- ✅ Validates email format
- ✅ Validates password required
- ✅ Submits with valid credentials
- ✅ Displays error messages
- ✅ Disables button while loading
- ✅ Toggles password visibility

### Running Frontend Tests

```bash
cd frontend

# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- Dashboard.test.tsx

# Run with coverage
npm run test:coverage

# View coverage report
open coverage/index.html
```

### Frontend Test Configuration

Vitest is configured in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

## Test Coverage

### Coverage Goals

- **Backend**: Aim for 80%+ coverage
- **Frontend**: Aim for 70%+ coverage
- **Critical paths**: 100% coverage (auth, payment, data integrity)

### Current Coverage

Run coverage reports to see current state:

```bash
# Backend
cd backend
pytest --cov=. --cov-report=term

# Frontend
cd frontend
npm run test:coverage
```

### Coverage Reports

Coverage reports are generated in:
- Backend: `backend/htmlcov/index.html`
- Frontend: `frontend/coverage/index.html`

## Writing New Tests

### Backend Test Example

```python
def test_new_endpoint(client, mock_auth, admin_user):
    """Test description"""
    with mock_g_user(admin_user):
        with patch('services.auth_service.User.query') as mock_query:
            mock_query.filter_by.return_value.first.return_value = admin_user

            response = client.get(
                '/api/new-endpoint',
                headers=create_auth_header(admin_user)
            )
            assert response.status_code == 200
```

### Frontend Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import MyComponent from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Mock External Dependencies**: Don't make real API calls in tests
4. **Test User Behavior**: Test what users do, not implementation details
5. **Keep Tests Independent**: Each test should be able to run alone
6. **Use Fixtures**: Reuse common test data and setup
7. **Test Edge Cases**: Empty states, errors, boundary conditions

## Mocking External Services

### Backend Mocking

```python
# Mock Supabase Auth
@patch('services.auth_service.supabase')
def test_with_auth(mock_supabase):
    mock_supabase.auth.get_user.return_value = mock_user

# Mock OpenAI
@patch('services.openai_service.client')
def test_openai(mock_openai):
    mock_openai.chat.completions.create.return_value = mock_response

# Mock Google Sheets
@patch('services.google_sheets_service.gspread.service_account_from_dict')
def test_sheets(mock_gspread):
    mock_gspread.return_value = mock_client
```

### Frontend Mocking

```typescript
// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;
mockedAxios.get.mockResolvedValue({ data: mockData });

// Mock React Router
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock Context
vi.mock('../../../contexts/AuthContext');
mockedUseAuth.mockReturnValue({ user: mockUser });
```

## Continuous Integration

### GitHub Actions (Recommended Setup)

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest --cov=. --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:coverage
      - uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

**Backend**

1. **Import errors**: Make sure `backend` is in Python path
   ```bash
   export PYTHONPATH="${PYTHONPATH}:/path/to/backend"
   ```

2. **Database errors**: Tests use in-memory SQLite, ensure migrations are compatible

3. **Mock not working**: Check patch path matches actual import location

**Frontend**

1. **Module not found**: Check `vitest.config.ts` path aliases

2. **Timeout errors**: Increase timeout in `waitFor()`
   ```typescript
   await waitFor(() => { ... }, { timeout: 5000 });
   ```

3. **Component not rendering**: Ensure all providers are in test wrapper

### Getting Help

- Check test output for detailed error messages
- Use `-v` flag for verbose output
- Use `console.log()` or `screen.debug()` to inspect state
- Review example tests in this codebase

## Next Steps

### Areas for Improvement

1. **E2E Testing**: Add Playwright or Cypress for full user flows
2. **Performance Testing**: Add load tests for API endpoints
3. **Visual Regression**: Add screenshot comparison tests
4. **Accessibility**: Add a11y tests with jest-axe
5. **Security Testing**: Add security-focused tests (XSS, SQL injection)

### Adding Tests for New Features

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all new code has test coverage
3. Test both happy path and error cases
4. Update this documentation
5. Run full test suite before committing

## Summary

InsightPulse has comprehensive test coverage for both backend and frontend:

- **75+ backend tests** covering API endpoints, services, and models
- **25+ frontend tests** covering key components and user flows
- **Mocking** of external services (Supabase, OpenAI, Google Sheets)
- **Coverage reporting** to track test quality
- **Easy to run** with simple commands

Keep tests up to date as you develop new features!
