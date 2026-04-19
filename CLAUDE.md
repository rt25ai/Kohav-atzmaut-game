# כוכב של עצמאות - Claude Context

Hebrew Independence Day community game for Kochav Michael neighborhood events. Players answer MCQ questions, complete photo missions, and compete on a live leaderboard.

## Commands

```bash
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build (includes Next.js type checking)
npm run start        # Start the production server after build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npx eslint src scripts next.config.ts eslint.config.mjs  # Focused lint when temp dirs make repo-wide lint too slow
npm run seed         # Seed Supabase content from .env.local

# Verification scripts (no test runner required)
node --import tsx scripts/verify-answer-review.ts      # MCQ answer review state machine
node --import tsx scripts/verify-photo-gallery.ts      # Bonus gallery constants + lightbox metadata
node --import tsx scripts/verify-player-experience.ts  # Participant voice labels, progress, gallery grouping
node --import tsx scripts/verify-question-bank.ts      # Question bank integrity checks
```

## Environment Setup

Copy `env.example` to `.env.local`.

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ADMIN_PASSWORD=
ADMIN_COOKIE_SECRET=   # long random string
ADMIN_ROUTE_SEGMENT=   # secret URL segment for the admin panel
```

If the three Supabase variables are missing, the app runs in local JSON mode backed by `data/local-db.json`.

## Architecture

```text
src/
  app/                        # Next.js App Router pages + API routes
    page.tsx                  # Landing / QR entry
    play/page.tsx             # Main game flow
    summary/page.tsx          # End-of-game summary + extra photo upload
    gallery/page.tsx          # Public photo gallery
    leaderboard/page.tsx      # Live leaderboard
    [secret]/page.tsx         # Admin panel route
    api/game/                 # Game actions: start, answer, mission, heartbeat, session
    api/admin/                # Admin actions: players, photos, settings, export
    api/public/               # Public snapshot, gallery, leaderboard
  components/
    play/play-experience.tsx  # Main player UI orchestrator
    admin/admin-console.tsx   # Admin dashboard
    shared/                   # App shell, brand header, sound provider
  hooks/
    use-live-json.ts          # Polling + optional Supabase Realtime refresh
    use-heartbeat.ts          # Keeps active players marked online
  lib/
    config.ts                 # App constants + IS_SUPABASE_ENABLED flag
    types.ts                  # Shared TypeScript source of truth
    auth/admin.ts             # Signed admin cookie helpers
    data/
      index.ts                # Single repository entry point
      local-repository.ts     # server-only JSON store at data/local-db.json
      supabase-repository.ts  # Supabase Postgres + Storage implementation
    content/
      default-bank.ts         # Default question + mission bank
      content-seed.ts         # Seed row builders for Supabase
    game/
      answer-review.ts        # Pure answer feedback helpers
      player-experience.ts    # Participant voice, progress, gallery grouping
      scoring.ts              # Score math
      run-plan.ts             # Question / mission sequencing
    utils/image-upload.ts     # compressForUpload() for full + thumbnail images
scripts/
  seed.ts
  verify-*.ts
supabase/
  schema.sql
```

## Key Patterns

**Dual data layer**  
`IS_SUPABASE_ENABLED` in `src/lib/config.ts` decides whether `repository.*` resolves to the local or Supabase implementation. Do not import `local-repository.ts` or `supabase-repository.ts` directly from app code; always go through `src/lib/data/index.ts`.

**Local mode persists**  
Local mode is not ephemeral. `src/lib/data/local-repository.ts` writes to `data/local-db.json` and serializes writes through an internal queue. Deleting `data/local-db.json` is the fastest way to reset local state while debugging.

**Admin route and auth**  
The admin UI lives at `/<ADMIN_ROUTE_SEGMENT>` via `src/app/[secret]/page.tsx`. Auth is a signed `httpOnly` cookie created in `src/lib/auth/admin.ts`.

**Live data refresh**  
`src/hooks/use-live-json.ts` always polls every `SNAPSHOT_POLL_MS` (12s). When Supabase is configured and a caller passes `tables`, it also subscribes to Postgres changes through Supabase Realtime. `src/hooks/use-heartbeat.ts` posts every `HEARTBEAT_INTERVAL_MS` (20s) to keep the player active.

**Answer review flow**  
After a player submits an MCQ answer, the play screen enters a review state (`idle -> correct/wrong`). Use `getAnswerReviewState` and `getOptionVisualState` from `src/lib/game/answer-review.ts`. The next step is blocked until `awaitingContinue` is cleared.

**Player voice and gallery grouping**  
`src/lib/game/player-experience.ts` owns participant-specific copy (`solo_male`, `solo_female`, `family`), progress counters, and public gallery grouping / cover selection. Run `scripts/verify-player-experience.ts` after changing participant copy or grouping logic.

**Object URL cleanup**  
Mission and summary photo previews use `URL.createObjectURL`. Revoke the previous object URL on every new file selection and on unmount to avoid leaking browser memory.

## Stack Gotchas

- Tailwind is v4, so config lives in `postcss.config.mjs`, not `tailwind.config.js`.
- React is v19; avoid older ecosystem advice that assumes React 18-era behavior.
- `next.config.ts` keeps `images.unoptimized: true` because Supabase Storage image URLs are external.
- `scripts/seed.ts` uses `--env-file=.env.local` and `--import tsx`; Node 22+ is required for the `npm run seed` workflow.
- `src/lib/auth/admin.ts` falls back to predictable dev-only values if `ADMIN_PASSWORD` or `ADMIN_COOKIE_SECRET` are missing. Set both explicitly outside throwaway local dev.
- `correctOptionIndex` must stay in sync with `correctOptionId` in the question objects. `scripts/verify-question-bank.ts` enforces this.
