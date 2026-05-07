# Weightlifting Tracker

A responsive weightlifting progress tracker for iPhone, Android, tablets, and desktop.

## Features

- Log lifted weight for:
  - Leg press - one leg
  - Hip thrust
  - Leg extension
  - Hip adductor machine
- Persist entries in PostgreSQL for long-term history.
- View weekly, monthly, quarterly, or yearly progress on demand.
- Accessible form controls, keyboard-friendly interactions, and SVG charts with screen-reader summaries.
- Mobile-first responsive layout.

## Run Locally

```bash
npm install
cp .env.example .env
docker compose up -d postgres
npm run db:setup
npm run dev
```

Open `http://127.0.0.1:5173`.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

## Database

The app uses `DATABASE_URL` and the SQL schema in `db/schema.sql`.

