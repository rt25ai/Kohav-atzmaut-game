# כוכב של עצמאות — Claude Context

Hebrew Independence Day community game. Players answer MCQ questions and complete photo missions, earning points on a live leaderboard. Built for Kochav Michael neighborhood events.

## Commands

```bash
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build (also type-checks)
npm run typecheck    # tsc --noEmit without building
npm run lint         # ESLint
npm run seed         # Seed Supabase with default content (requires .env.local)

# Verification scripts (no test framework needed)
node --import tsx scripts/verify-answer-review.ts
node --import tsx scripts/verify-question-bank.ts
```

## Environment Setup

Copy `env.example` → `.env.local`. Required for Supabase mode:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_PASSWORD=
ADMIN_COOKIE_SECRET=   # long random string
ADMIN_ROUTE_SEGMENT=   # secret URL segment for admin panel
```

Without the three Supabase vars, the app runs in **local (in-memory) mode** — no persistence across restarts.

## Architecture

```
src/
  app/                      # Next.js App Router pages
    page.tsx                # Landing / QR entry
    play/page.tsx           # Game play screen
    summary/page.tsx        # End-of-game summary
    gallery/page.tsx        # Photo gallery
    leaderboard/page.tsx    # Live leaderboard
    [secret]/page.tsx       # Admin panel (route segment from env)
    api/game/               # Game API routes (answer, mission, heartbeat, session…)
    api/admin/              # Admin API routes (players, photos, settings, export…)
    api/public/             # Public snapshot, leaderboard, gallery
  components/
    play/play-experience.tsx    # Main game UI orchestrator
    admin/admin-console.tsx
    shared/                     # AppShell, BrandHeader, SoundProvider…
  lib/
    types.ts                    # All shared TypeScript types (source of truth)
    config.ts                   # App constants + IS_SUPABASE_ENABLED flag
    data/
      index.ts                  # repository — routes to local or supabase impl
      local-repository.ts       # In-memory store (idb-keyval)
      supabase-repository.ts    # Supabase Postgres impl
    game/
      answer-review.ts          # Pure helper: visual states for MCQ answer feedback
      scoring.ts, run-plan.ts…
    content/
      default-bank.ts           # Default question + mission bank (20 MCQs, family-friendly)
    utils/image-upload.ts       # compressForUpload() — full + thumbnail via browser-image-compression
```

## Key Patterns

**Dual data layer** — `IS_SUPABASE_ENABLED` in `lib/config.ts` gates everything. All API routes call `repository.*` which resolves to the right impl at import time. Never import local/supabase repos directly — always go through `lib/data/index.ts`.

**Admin route** — The admin panel lives at `/<ADMIN_ROUTE_SEGMENT>`. It's a dynamic route `[secret]/page.tsx`. The segment is read from `process.env.ADMIN_ROUTE_SEGMENT` in `lib/config.ts`.

**Object URL cleanup** — Mission photo previews use `URL.createObjectURL`. Always revoke on unmount and on each new file selection to prevent memory leaks.

**Answer review flow** — After submitting an MCQ answer, the play screen enters a review state (`idle → correct/wrong`). Use `getAnswerReviewState` / `getOptionVisualState` from `lib/game/answer-review.ts`. The player cannot proceed until `awaitingContinue` is cleared via the "המשך" button.

**Polling** — `use-live-json.ts` polls public snapshot every `SNAPSHOT_POLL_MS` (12s). `use-heartbeat.ts` pings every `HEARTBEAT_INTERVAL_MS` (20s) to mark player active.

## Stack Gotchas

- **Tailwind v4** (not v3) — config lives in `postcss.config.mjs`, not `tailwind.config.js`
- **React 19** — some older community patterns don't apply
- **`next.config.ts`** has `images.unoptimized: true` — required because Supabase Storage URLs are external and signed
- **Seed script** uses `--env-file=.env.local` + `--import tsx` — Node 22+ required for `--env-file`
- **`correctOptionIndex`** must stay in sync with `correctOptionId` in question objects — `verify-question-bank.ts` asserts this
