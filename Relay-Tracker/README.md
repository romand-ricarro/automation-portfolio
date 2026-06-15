# Relay

**Fast track from report to resolution**

Relay is a modern bug and task tracking web application that integrates with Jira Cloud. It provides a beautiful, customizable interface for users to report issues while keeping all data synchronized with your Jira project.

## Features

- Modern React 19 frontend with Tailwind CSS
- Dark/Light mode support
- Python Flask serverless backend
- Bidirectional sync with Jira Cloud
- Direct Google OAuth 2.0 authentication
- Private access via email whitelist
- Email notifications (SendGrid)
- Discord notifications
- Role-based access control (User, SQA, Admin)

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS
- Lucide React (icons)
- Direct Google OAuth 2.0 (Identity Tokens)

### Backend
- Python Flask (serverless on Vercel)
- Turso (libsql) - Edge-ready SQLite database
- Jira Cloud REST API v3

### Hosting
- Vercel (frontend + backend serverless)

## Access Control

Relay uses an **email whitelist** for private access control. Only whitelisted emails can sign in with Google OAuth. This ensures only authorized team members can access the application.

### User Roles

| Role      | Permissions                                                    |
| --------- | -------------------------------------------------------------- |
| **User**  | Create tickets, view all tickets, edit/cancel own tickets only |
| **SQA**   | All User permissions + edit any ticket + bulk operations       |
| **Admin** | All SQA permissions + delete tickets + manage users/roles + manage whitelist |

## Project Structure

```
relay-tracker/
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and API client
│   │   ├── types/           # TypeScript types
│   │   ├── context/         # React context providers
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   └── package.json
├── backend/                 # Flask backend
│   ├── api/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utility functions
│   │   ├── models/          # Database schema
│   │   ├── requirements.txt # Python dependencies (MUST be here for Vercel)
│   │   └── index.py         # Flask app entry point
│   ├── requirements.txt     # Root requirements (for local dev)
│   └── migrate_whitelist.py # Whitelist migration script
├── docs/                    # Documentation
├── vercel.json              # Vercel deployment config
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Python 3.9 or higher
- npm or yarn
- Turso CLI (for database)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   VITE_API_URL=http://localhost:5001
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:5173`

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create `.env` file with your configuration (see Environment Variables section)

5. Run database migrations:
   ```bash
   python migrate_whitelist.py
   ```

6. Start the development server:
   ```bash
   python api/index.py
   ```

   The backend will be available at `http://localhost:5001`

## Environment Variables

### Backend (.env)

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | Turso database URL (libsql://your-db.turso.io) |
| `TURSO_AUTH_TOKEN` | Turso authentication token |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `JWT_SECRET_KEY` | Secret key for JWT token signing |
| `JIRA_URL` | Your Jira Cloud URL (e.g., https://yourcompany.atlassian.net) |
| `JIRA_EMAIL` | Email associated with Jira API token |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_PROJECT_KEY` | Jira project key |
| `SENDGRID_API_KEY` | SendGrid API key for emails (optional) |
| `DISCORD_WEBHOOK_BUGS` | Discord webhook URL for bugs channel (optional) |
| `DISCORD_WEBHOOK_TASKS` | Discord webhook URL for tasks channel (optional) |
| `DISCORD_WEBHOOK_STORIES` | Discord webhook URL for stories channel (optional) |
| `FRONTEND_URL` | Frontend URL for CORS (optional) |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_API_URL` | Backend API URL (leave empty for production same-origin) |

## First-Time Setup

**IMPORTANT:** Before anyone can sign in, you must add the first admin email to the whitelist.

### Using Turso CLI:

```bash
turso db shell your-database-name
```

In Turso shell:
```sql
INSERT INTO allowed_emails (email, notes)
VALUES ('your-email@example.com', 'First admin user');
```

The first user to sign in will automatically become admin. After that, use the **Admin > Email Whitelist** page to add more users.

## Deployment

### Vercel Deployment

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Import the project in Vercel

3. Configure environment variables in the Vercel dashboard:
   - **DO NOT** set `VITE_API_URL` (leave empty for same-origin requests)
   - **DO NOT** set `VITE_DEV_BYPASS_AUTH` in production

4. Deploy!

The application will be available at `https://relay-tracker.vercel.app` (or your custom domain)

### Important Deployment Notes

See [docs/CONTEXT.md](docs/CONTEXT.md) for detailed deployment troubleshooting, including:
- Python relative imports for Vercel
- Requirements.txt location
- CORS configuration
- Build cache issues

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/verify` | POST | Verify Google token |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/users` | GET | List all users (admin) |
| `/api/issues` | GET | List issues |
| `/api/issues` | POST | Create issue |
| `/api/issues/{key}` | GET | Get issue details |
| `/api/issues/{key}` | PUT | Update issue |
| `/api/whitelist` | GET | List whitelisted emails (admin) |
| `/api/whitelist` | POST | Add email to whitelist (admin) |
| `/api/whitelist/{id}` | DELETE | Remove email from whitelist (admin) |

## Branding

- **Name**: Relay
- **Tagline**: "Fast track from report to resolution"
- **Colors**: Orange/Red gradient (#FF6B35 → #F7931E)
- **Style**: Modern, glassmorphism, clean
- **Logo**: Signal waves icon

## Security

- All authentication via Google OAuth 2.0
- JWT tokens for session management
- Email whitelist for access control
- Role-based permissions
- CORS protection
- No sensitive data stored in frontend

## License

Private - Internal use only
