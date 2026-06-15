# InsightPulse

A tailored full-stack web application for analyzing training survey data using AI.

## Overview

InsightPulse automates the analysis of Google Form responses for training sessions. It pulls data from Google Sheets, uses OpenAI (GPT-4o) to analyze open-ended feedback, and identifies common issues and patterns.

## Features

- **Automated AI Analysis**: Summarizes feedback and identifies key insights.
- **Common Issues Detection**: Aggregates recurring themes across responses.
- **Action Item Management**: Facilitators can track and manage follow-up actions.
- **Session Ratings**: Visual dashboards for key metrics like Repeatability and Quality.
- **Role-Based Access**: Admin, Facilitator, and Viewer roles.
- **Dark Mode**: Fully supported UI.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Python Flask, SQLAlchemy, OpenAI API, Google Sheets API
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Vercel (Frontend & Serverless Backend)

## Quick Start

1. **Prerequisites**: Node.js 18+, Python 3.9+, Supabase project, Google Cloud Service Account.
2. **Setup**: Follow the [Setup Guide](docs/SETUP.md).
3. **Environment**: Configure `.env` in `backend/` and `.env` in `frontend/`.
4. **Run**:
   - Backend: `flask run` (port 8000)
   - Frontend: `npm run dev` (port 5173)

## Documentation

- [Setup Guide](docs/SETUP.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Google Sheets API Setup](docs/GOOGLE_SHEETS_API_SETUP.md)
- [API Documentation](docs/API_DOCUMENTATION.md)

## License

Private
