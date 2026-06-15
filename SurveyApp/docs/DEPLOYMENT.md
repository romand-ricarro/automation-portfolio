# Deployment Guide

## Prerequisites
- **Vercel Account**
- **Supabase Project**
- **GitHub Repository**

## Backend Deployment (Vercel Serverless)

1. **Vercel Configuration**:
   The `backend/vercel.json` is configured to rewrite API requests to `app.py`.

2. **Environment Variables**:
   In Vercel Project Settings, add:
   - `FLASK_ENV`: production
   - `OPENAI_API_KEY`: ...
   - `SUPABASE_URL`: ...
   - `SUPABASE_SERVICE_KEY`: ...
   - `GOOGLE_SHEETS_CREDENTIALS`: ... (JSON string)
   - `GOOGLE_SHEETS_SPREADSHEET_ID`: ...

3. **Deploy**:
   Connect your GitHub repo to Vercel. Set the **Root Directory** to `backend`?
   *Actually, usually for monorepo on Vercel, you might deploy two projects or use a rewrite from frontend -> backend.*
   
   **Recommended Strategy**:
   - **Project 1 (Frontend)**: Root `frontend`. Build command `npm run build`. Output `dist`.
   - **Project 2 (Backend)**: Root `backend`. Runtime Python.
   
   *Or use Vercel's multi-framework support.*

## Frontend Deployment

1. Create a new Project in Vercel.
2. Select the repository.
3. Set **Root Directory** to `frontend`.
4. **Build Command**: `vite build` (or `npm run build`)
5. **Output Directory**: `dist`
6. **Environment Variables**:
   - `VITE_API_URL`: The URL of your deployed Backend project (e.g., `https://survey-api.vercel.app/api`).
   - `VITE_SUPABASE_URL`: ...
   - `VITE_SUPABASE_ANON_KEY`: ...

## Database Setup
1. Run the `backend/database/schema.sql` script in your Supabase SQL Editor to create tables.
2. (Optional) Run `backend/database/seed_data.sql` for test data.
