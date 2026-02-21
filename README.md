# Ramadan Competition Backend

Backend architecture for a Ramadan gamification mobile app using Node.js, Express, Prisma, and PostgreSQL.

## Core Architecture

- Activity-first design: points and counters are derived from `Activity` records.
- Dynamic task engine: task definitions and rules are database-driven.
- Dynamic counters: no fixed counter columns on `User`.
- Tag targeting: task visibility depends on user tags.
- Public leaderboard clamping: negative totals are shown as `0` publicly.
- Fasting multiplier: points are multiplied during fasting windows fetched from prayer APIs.
- Forbidden privacy: forbidden task details are private at the application/API layer.

## Module Layout

- `src/core`: config, db client, middleware, shared utilities.
- `src/integrations/prayer-times`: astronomical prayer-time integration.
- `src/modules/auth`: session entrypoint skeleton.
- `src/modules/users`: profile + user tags.
- `src/modules/tags`: tag listing.
- `src/modules/tasks`: dynamic task visibility and retrieval.
- `src/modules/activities`: task completion activity write path.
- `src/modules/counters`: dynamic counter projections.
- `src/modules/leaderboard`: public leaderboard projection.
- `src/modules/notifications`: user notification inbox APIs.
- `src/modules/daily-questions`: daily question read/answer APIs.
- `src/modules/admin`: task/counter/adjustment/notification/question admin APIs.

## Setup

1. Install dependencies.
   `npm install`
2. Generate Prisma client.
   `npm run prisma:generate`
3. Create migration.
   `npm run prisma:migrate -- --name init`
4. Start the API.
   `npm run dev`

## API Base

- `http://localhost:3000/api/v1`