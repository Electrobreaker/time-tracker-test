# Time Tracker Test Assignment

Simple time tracking app with:
- Time Entry form (date, project, hours, description)
- Entry History grouped by date + totals
- Filtering by month/year + “Show all”
- Delete entries

## Tech Stack

### Frontend
- Next.js (React + TypeScript)
- Tailwind CSS

### Backend
- Node.js + Express + TypeScript
- REST API

### Database
- SQLite
- Prisma (Prisma ORM v7 + SQLite adapter)

## Project Structure

```text
time-tracker-test/
├─ apps/
│  ├─ web/   # Next.js frontend
│  └─ api/   # Express backend + Prisma
├─ package.json  # npm workspaces (monorepo)
└─ README.md


## Prerequisites

- Node.js 18+ (recommended 20+)
- npm

## Setup

From the repository root:

```bash
npm install
1) Configure environment variables
API (apps/api/.env)
Create a file apps/api/.env:

DATABASE_URL="file:./dev.db"
This creates a local SQLite database file at apps/api/dev.db (ignored by git).

Web (optional)
If you want to explicitly configure the API URL, create apps/web/.env.local:

2) Initialize the database (Prisma migrate)
Run Prisma migrations from the API app:

cd apps/api
npx prisma migrate dev --name init

3) Run the project (development)
Open two terminals:

Terminal 1 — API
From repo root:

bash
npm run dev -w api

API will be available at:

http://localhost:3001

Health check: http://127.0.0.1:3001/health

Terminal 2 — Web
From repo root:

bash
npm run dev -w web
Web will be available at:

http://localhost:3000

4) Quick sanity check
Create an entry (example):

curl -X POST http://127.0.0.1:3001/entries \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-01-29","project":"Client A","hours":2,"description":"Setup project"}'


Fetch entries:
curl http://127.0.0.1:3001/entries
makefile