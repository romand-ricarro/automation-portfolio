# Relay Frontend

Modern React frontend for the Relay bug and task tracking application.

## Tech Stack

- **React 19** + TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **@react-oauth/google** - Google OAuth integration

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── issues/          # Issue-related components
│   ├── ui/              # Base UI components
│   ├── Navbar.tsx       # Navigation bar
│   ├── MainLayout.tsx   # Main layout wrapper
│   ├── Toast.tsx        # Toast notifications
│   └── index.ts         # Component exports
├── pages/               # Page components
│   ├── Issues.tsx       # Issue list page
│   ├── IssueDetail.tsx  # Issue detail view
│   ├── Profile.tsx      # User profile page
│   ├── AdminSettings.tsx # Admin user management
│   └── WhitelistManagement.tsx # Email whitelist admin
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # Authentication hook
│   └── useTheme.ts      # Theme management hook
├── context/             # React context providers
│   ├── AuthContext.tsx  # Authentication context
│   └── auth-context.ts  # Auth types
├── lib/                 # Utilities and API client
│   └── api.ts           # API client functions
├── types/               # TypeScript type definitions
│   └── index.ts         # Shared types
├── App.tsx              # Main app component with routing
└── main.tsx             # Application entry point
```

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create `.env` file:
   ```env
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   VITE_API_URL=http://localhost:5001
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID | Yes |
| `VITE_API_URL` | Backend API URL | Dev only |

**Important:**
- In production (Vercel), do NOT set `VITE_API_URL` - leave it empty for same-origin requests
- Never set `VITE_DEV_BYPASS_AUTH` in production

## Features

### Authentication
- Google OAuth 2.0 sign-in
- JWT token management
- Role-based access control (User, SQA, Admin)
- Email whitelist verification

### Issue Management
- Create bugs, tasks, and stories
- View and filter issue list
- Issue detail view with comments
- Inline editing (for own issues or with elevated roles)
- Attachment support

### Admin Features
- User role management
- Email whitelist management

### UI/UX
- Dark/Light theme support
- Responsive design
- Toast notifications
- Loading states and skeletons
- Network status indicator

## Code Style

- Use TypeScript for all components
- Functional components with hooks
- Tailwind CSS for styling
- Lucide React for icons
- Follow existing component patterns

## Deployment

The frontend is deployed to Vercel as a static build:

1. Build command: `npm run build`
2. Output directory: `dist`
3. Environment variables configured in Vercel dashboard

See [../docs/CONTEXT.md](../docs/CONTEXT.md) for detailed deployment notes.

## Related Documentation

- [Root README](../README.md) - Project overview
- [Backend README](../backend/README.md) - Backend documentation
- [Deployment Guide](../docs/CONTEXT.md) - Vercel deployment guide
