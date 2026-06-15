# Relay Backend

Python Flask backend for the Relay bug and task tracking application.

## Tech Stack

- **Flask** - Python web framework (serverless on Vercel)
- **Turso (libsql)** - Edge-ready SQLite database
- **Jira Cloud REST API v3** - Issue tracking integration
- **Google OAuth 2.0** - Authentication
- **SendGrid** - Email notifications (optional)

## Project Structure

```
backend/
├── api/
│   ├── routes/              # API route handlers
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── issues.py        # Issue CRUD endpoints
│   │   └── whitelist.py     # Email whitelist management
│   ├── services/            # Business logic
│   │   ├── jira_service.py  # Jira API integration
│   │   └── email_service.py # Email notifications
│   ├── utils/               # Utility functions
│   │   ├── auth.py          # Auth decorators
│   │   ├── database.py      # Database operations
│   │   └── template_builder.py # Jira template formatting
│   ├── models/              # Database schema
│   │   └── schema.sql       # SQLite schema
│   ├── requirements.txt     # Dependencies (MUST be here for Vercel)
│   └── index.py             # Flask app entry point
├── requirements.txt         # Root requirements (for local dev)
└── migrate_whitelist.py     # Whitelist migration script
```

## Development Setup

1. Create a virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create `.env` file:
   ```env
   # Database
   TURSO_DATABASE_URL=libsql://your-db.turso.io
   TURSO_AUTH_TOKEN=your-turso-token

   # Authentication
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   JWT_SECRET_KEY=your-jwt-secret-key

   # Jira
   JIRA_URL=https://yourcompany.atlassian.net
   JIRA_EMAIL=your-email@company.com
   JIRA_API_TOKEN=your-jira-api-token
   JIRA_PROJECT_KEY=YOUR_PROJECT

   # Optional
   SENDGRID_API_KEY=your-sendgrid-key
   DISCORD_WEBHOOK_BUGS=webhook-url
   DISCORD_WEBHOOK_TASKS=webhook-url
   DISCORD_WEBHOOK_STORIES=webhook-url
   FRONTEND_URL=http://localhost:5173
   ```

4. Run migrations:
   ```bash
   python migrate_whitelist.py
   ```

5. Start the development server:
   ```bash
   python api/index.py
   ```

   The API will be available at `http://localhost:5001`

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TURSO_DATABASE_URL` | Turso database URL | Yes |
| `TURSO_AUTH_TOKEN` | Turso auth token | Yes (prod) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `JWT_SECRET_KEY` | JWT signing secret | Yes |
| `JIRA_URL` | Jira Cloud base URL | Yes |
| `JIRA_EMAIL` | Jira API email | Yes |
| `JIRA_API_TOKEN` | Jira API token | Yes |
| `JIRA_PROJECT_KEY` | Jira project key | Yes |
| `SENDGRID_API_KEY` | SendGrid API key | No |
| `DISCORD_WEBHOOK_*` | Discord webhook URLs | No |
| `FRONTEND_URL` | Frontend URL for CORS | No |

## Getting API Credentials

### Turso Database

1. Install Turso CLI: `curl -sSfL https://get.turso.io | bash`
2. Login: `turso auth login`
3. Create database: `turso db create relay-db`
4. Get URL: `turso db show relay-db --url`
5. Get token: `turso db tokens create relay-db`

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized origins and redirect URIs

### Jira API

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create a new API token
3. Use your Atlassian email as `JIRA_EMAIL`

## Database Schema

The database stores:
- **user_roles** - User information and roles
- **user_preferences** - Notification settings and theme
- **activity_log** - User activity tracking
- **allowed_emails** - Email whitelist for access control

All issue data is stored in Jira Cloud (pure passthrough architecture).

## API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/verify` | POST | Verify Google token |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/preferences` | GET/PUT | User preferences |
| `/api/auth/users` | GET | List all users (admin) |
| `/api/auth/users/{id}/role` | PUT | Update user role (admin) |

### Issues
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/issues` | GET | List issues with filters |
| `/api/issues` | POST | Create new issue |
| `/api/issues/{key}` | GET | Get issue details |
| `/api/issues/{key}` | PUT | Update issue |
| `/api/issues/{key}` | DELETE | Delete issue (admin) |
| `/api/issues/{key}/comments` | POST | Add comment |
| `/api/issues/updates` | GET | Get recent updates |

### Whitelist
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/whitelist` | GET | List whitelisted emails |
| `/api/whitelist` | POST | Add email to whitelist |
| `/api/whitelist/{id}` | DELETE | Remove email |
| `/api/whitelist/check/{email}` | GET | Check if whitelisted |

## Authentication Flow

```
1. User clicks "Sign in with Google"
2. Frontend gets Google ID token
3. Frontend sends token to POST /api/auth/verify
4. Backend verifies token with Google
5. Backend checks email whitelist
6. Backend creates/updates user in database
7. Backend returns JWT token
8. Frontend stores JWT for subsequent requests
```

## Jira Integration

The backend transforms simple user input into a structured SQA template before creating issues in Jira:

- Auto-detects browser and OS from user agent
- Formats description with template sections
- Handles attachments and comments
- Syncs status changes bidirectionally

## Deployment

### Vercel Configuration

**IMPORTANT:** For Vercel deployment:

1. `requirements.txt` MUST be in `backend/api/` directory (same as `index.py`)
2. All imports MUST be relative (use `from .utils.auth` not `from api.utils.auth`)
3. Add production URL to CORS origins in `index.py`

See [../docs/CONTEXT.md](../docs/CONTEXT.md) for detailed deployment troubleshooting.

## Development Tips

### Running Migrations

```bash
python migrate_whitelist.py
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:5001/api/health

# Get root info
curl http://localhost:5001/
```

### Debugging

Enable Flask debug mode for development:
```python
app.run(host="0.0.0.0", port=5001, debug=True)
```

## Related Documentation

- [Root README](../README.md) - Project overview
- [Frontend README](../frontend/README.md) - Frontend documentation
- [Deployment Guide](../docs/CONTEXT.md) - Vercel deployment guide
