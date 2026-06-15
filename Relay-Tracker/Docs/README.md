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
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   └── package.json
├── backend/                 # Flask backend
│   ├── api/
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── utils/           # Utility functions
│   │   ├── models/          # Data models
│   │   └── index.py         # Flask app entry point
│   └── requirements.txt
├── vercel.json              # Vercel deployment config
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Python 3.9 or higher
- npm or yarn

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   VITE_API_URL=http://localhost:5001
   ```

5. Start the development server:
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

4. Create `.env` file from example:
   ```bash
   cp .env.example .env
   ```

5. Update the `.env` file with your configuration (see Environment Variables section)

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
| `JWT_SECRET_KEY` | Secret key for JWT signing |
| `JIRA_URL` | Your Jira Cloud URL (e.g., https://yourcompany.atlassian.net) |
| `JIRA_EMAIL` | Email associated with Jira API token |
| `JIRA_API_TOKEN` | Jira API token |
| `JIRA_PROJECT_KEY` | Jira project key |
| `SENDGRID_API_KEY` | SendGrid API key for emails |
| `DISCORD_WEBHOOK_BUGS` | Discord webhook URL for bugs channel |
| `DISCORD_WEBHOOK_TASKS` | Discord webhook URL for tasks channel |
| `DISCORD_WEBHOOK_STORIES` | Discord webhook URL for stories channel |
| `FRONTEND_URL` | Frontend URL for CORS |

### Frontend (.env)

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `VITE_API_URL` | Backend API URL (leave empty for production) |

## Deployment

### Vercel Deployment

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Import the project in Vercel

3. Configure environment variables in the Vercel dashboard

4. Deploy!

The application will be available at `https://relay-tracker.vercel.app` (or your custom domain)

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/verify` | POST | Verify Google token |
| `/api/auth/me` | GET | Get current user |
| `/api/issues` | GET | List issues |
| `/api/issues` | POST | Create issue |
| `/api/issues/{key}` | GET/PUT/DELETE | Issue operations |
| `/api/whitelist` | GET/POST | Whitelist management (admin) |
| `/api/whitelist/{id}` | DELETE | Remove from whitelist (admin) |

## Branding

- **Colors**: Orange/Red gradient (#FF6B35 → #F7931E)
- **Style**: Modern, glassmorphism, clean
- **Logo**: Signal waves icon

## License

Private - Internal use only
