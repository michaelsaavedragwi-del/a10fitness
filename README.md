# Velocity Lab

A force-plate + velocity monitoring dashboard for strength staff: compares each
athlete's measured performance against what their force-plate output predicts,
and surfaces the gap. See the top of the original build prompt for the full
design spec and the responsibility terms this project was built under — this
is a starting framework you finish and tune for your own program, not a
finished product.

## Stack

Next.js (App Router) + TypeScript, Prisma + PostgreSQL, NextAuth v5 (credentials).

## Setup

1. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` — your Postgres connection strings (e.g. Neon).
   - `AUTH_SECRET` — generate with `npx auth secret` or any random 32+ byte string.
   - `HAWKIN_API_KEY` — optional, only needed for force-plate sync. Generate it from Settings → Integrations in your Hawkin Dynamics account (org admin only) — it's a refresh token, shown once, so save it immediately.
   - `CRON_SECRET` — a random string; required in the `x-cron-secret` header to trigger the nightly sync route.
2. Install dependencies: `npm install`
3. Push the schema: `npm run db:push`
4. Seed one owner account:
   ```
   SEED_OWNER_EMAIL=you@example.com SEED_OWNER_NAME="Your Name" SEED_OWNER_PASSWORD=temp-password npm run db:seed
   ```
   You'll be forced to change this password on first login.
5. `npm run dev` and open http://localhost:3000

## Roles

- **owner** — full edit access (add/edit/archive/delete athletes and tests, run sync imports).
- **coach** — view-only everywhere, including movement/ROM data. Enforced server-side in every write action and server-side in the proxy for owner-only routes — not just hidden in the UI.

Create additional accounts directly in the `User` table (bcrypt-hash the password, `role` is `"owner"` or `"coach"`).

## The prediction model

`src/lib/prediction.ts` is the one file to rewrite for your own population — it
takes raw per-athlete metrics and returns `pred` / `gap` / `category` / ranks.
Nothing downstream cares how the number is produced. It has a pinned snapshot
test in `src/lib/__tests__/prediction.test.ts`; run `npm test`.

## Force-plate sync

`src/lib/hawkin/` is a working implementation against the Hawkin Dynamics
API (auth flow verified live, and the CMJ metric mapping in `mapping.ts` was
confirmed against a real account's raw test payload — see the comment there).
To use a different provider, replace the auth flow and endpoints in
`client.ts` and the metric mapping table in `mapping.ts` — the
preview/import/dedupe flow in `sync.ts` and the UI in `src/app/sync/` stay
the same.

The nightly cron route is `GET /api/cron/hawkin-sync` with header
`x-cron-secret: <CRON_SECRET>`. Wire this up with your host's scheduler (e.g.
Vercel Cron).

## PDF progress reports

`GET /athletes/[id]/report/pdf` renders the progress report through headless
Chrome, cropped to exactly one page sized to the content. Locally it launches
full `puppeteer`'s bundled Chromium; in production (`process.env.VERCEL` set)
it switches to `puppeteer-core` + `@sparticuz/chromium`, a Linux binary built
for serverless. Two things to know before you rely on it in production:

- **Function timeout.** A cold headless-Chrome launch plus render can take a
  few seconds. Vercel's Hobby plan caps serverless functions at 10s — if this
  route times out, either upgrade the plan or raise the function's `maxDuration`.
- **Function size.** `@sparticuz/chromium` is a real binary (tens of MB). It's
  designed to fit Vercel's function size limit, but it's worth watching your
  deployment size if you add other heavy dependencies later.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm start` — production build/run
- `npm test` — run the prediction model's test suite
- `npm run db:push` — push the Prisma schema to your database
- `npm run db:seed` — seed one owner account (see env vars above)
