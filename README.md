# automation-portfolio

A collection of automation projects built over time — Discord bots, API integrations, full-stack tools, and AI systems.

## Projects

| Project | Stack | Description |
|---|---|---|
| [Relay-Tracker](./Relay-Tracker) | React + Python | Full-stack Jira/Linear relay tracker with frontend dashboard |
| [SurveyApp](./SurveyApp) | React + Node.js | Full-stack survey creation and management application |
| [discordbotapi](./discordbotapi) | Python | Discord bot with a REST API layer for external integrations |
| [harrybotter2.0](./harrybotter2.0) | Python | Discord member management and onboarding bot |
| [rag_project](./rag_project) | Python + Streamlit | RAG (Retrieval-Augmented Generation) system with a Streamlit UI |
| [fssecbot](./fssecbot) | Python | Discord security and eligibility management bot |
| [fssecretarybot](./fssecretarybot) | Python | Discord bot for announcements and training message delivery |
| [fsdiscordbot](./fsdiscordbot) | Python | Discord check-in and timezone bot |
| [fsdiscordbotjs](./fsdiscordbotjs) | Node.js | Discord check-in bot rewritten in JavaScript |
| [correctiontrackerbot](./correctiontrackerbot) | Node.js | Discord bot for tracking corrections and updates |
| [allergen_validator](./allergen_validator) | Python | Script to validate allergen data and surface suggested corrections |
| [personalfinanceadvisor](./personalfinanceadvisor) | Python + Flask | Personal finance advisor web app with budgeting and investment tools |
| [recruiteeapi](./recruiteeapi) | Python | Scripts for fetching and processing candidate data from Recruitee ATS |
| [techtoolsbot](./techtoolsbot) | Python | Discord bot for tech tools onboarding and quiz management |

## Setup

Each project has its own dependencies. Generally:

- **Python projects**: `pip install -r requirements.txt`, copy `.env.example` to `.env` and fill in values
- **Node.js projects**: `npm install`, copy `.env.example` to `.env` and fill in values

Credentials and API keys are never committed — see each project's `.env.example` for required variables.
