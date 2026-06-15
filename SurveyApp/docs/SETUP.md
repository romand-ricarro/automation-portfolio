# Local Setup Guide

## Prerequisites
- Node.js 18+
- Python 3.9+
- PostgreSQL or Supabase project

## 1. Clone Repository
```bash
git clone <repo-url>
cd insight-pulse
```

## 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Configuration
1. Copy `.env.example` to `.env`.
2. Fill in your API keys (OpenAI, Supabase, Google Sheets).

### Database
1. Ensure your Postgres database is running or connected to Supabase.
2. Initialize tables using the schema in `database/schema.sql`.

### Run Server
```bash
flask run --port=8000
```

## 3. Frontend Setup
```bash
cd frontend
npm install
```

### Configuration
1. Create `.env.local`:
   ```env
   VITE_API_URL=http://localhost:8000/api
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-key
   ```

### Run Client
```bash
npm run dev
```
Access at `http://localhost:5173`.
