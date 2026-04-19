# Festive Play And Postgame Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a warm festive interaction layer across gameplay and let completed players keep uploading extra captioned photos from the summary screen without breaking mobile stability.

**Architecture:** Keep the current game flow and APIs intact, add one small deterministic festive-feedback helper to drive emoji copy and confetti cadence, render the visuals through a reusable client-only burst component, and move repeated postgame uploads into a dedicated summary child component. Reuse the existing sound system, image compression utility, and `/api/game/extra-photo` route so the work stays focused on UX rather than backend invention.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Framer Motion, Howler, Tailwind CSS, Playwright verification scripts, existing fetch-based game APIs.

---

## File Structure

- Create: `src/lib/game/festive-feedback.ts`
  Responsibility: deterministic festive cue selection for answers, transitions, uploads, and finish states.

- Create: `src/components/shared/festive-burst.tsx`
  Responsibility: short-lived festive chip plus optional lightweight flag-confetti burst that never blocks taps.

- Create: `src/components/summary/summary-extra-photo-form.tsx`
  Responsibility: repeated postgame upload flow with preview, caption, success state, and local uploaded-items list.

- Create: `scripts/verify-festive-feedback.ts`
  Responsibility: assert helper output for copy, emoji clusters, and confetti cadence.

- Create: `scripts/verify-summary-extra-photo.ts`
  Responsibility: verify the summary extra-photo form can upload twice in a row and surface saved captions without leaving the screen.

- Modify: `src/components/play/play-experience.tsx`
  Responsibility: trigger festive cues for answer save, transitions, photo choose, and mission upload success while preserving RTL and mobile layout.

- Modify: `src/components/summary/summary-page.tsx`
  Responsibility: mount the new extra-photo form beneath the reveal content and keep the existing summary flow intact.

- Modify: `src/lib/sound/generated-sfx.ts`
  Responsibility: retune the existing interaction cues to feel warmer and more celebratory during the new feedback moments.

- Modify: `src/app/globals.css`
  Responsibility: style festive chips, glow pulses, and bounded confetti layers with no horizontal overflow.

- Modify: `scripts/verify-mobile-play.ts`
  Responsibility: ensure the new festive answer feedback stays on-screen and does not break RTL/mobile layout.

## Task 1: Add Deterministic Festive Feedback Helper

**Files:**
- Create: `src/lib/game/festive-feedback.ts`
- Test: `scripts/verify-festive-feedback.ts`

- [ ] **Step 1: Write the failing verification script**

```ts
// scripts/verify-festive-feedback.ts
import assert from "node:assert/strict";

import { getFestiveCue } from "../src/lib/game/festive-feedback";

const savedFirst = getFestiveCue("answer-saved", 0);
assert.equal(savedFirst.copy, "נשמר, איזה כיף");
assert.deepEqual(savedFirst.emojis, ["✨", "🎉", "💙"]);
assert.equal(savedFirst.showConfetti, false);

const savedThird = getFestiveCue("answer-saved", 2);
assert.equal(savedThird.showConfetti, true);

const summaryFinished = getFestiveCue("summary-finished", 0);
assert.equal(summaryFinished.showConfetti, true);
assert.deepEqual(summaryFinished.emojis, ["🇮🇱", "🎉", "🥳"]);

const photoChosen = getFestiveCue("photo-chosen", 1);
assert.equal(photoChosen.copy, "עוד רגע יפה מהאירוע");
assert.deepEqual(photoChosen.emojis, ["📸", "✨"]);

console.log("verify-festive-feedback: PASS");
```

- [ ] **Step 2: Run the script to verify it fails**

Run: `node --import tsx scripts/verify-festive-feedback.ts`

Expected: FAIL with module resolution error because `src/lib/game/festive-feedback.ts` does not exist yet.

- [ ] **Step 3: Write the minimal helper**

```ts
// src/lib/game/festive-feedback.ts
export type FestiveEventName =
  | "answer-saved"
  | "step-transition"
  | "photo-chosen"
  | "mission-uploaded"
  | "summary-uploaded"
  | "summary-finished";

export type FestiveCue = {
  copy: string;
  emojis: string[];
  showConfetti: boolean;
};

const cueMap: Record<FestiveEventName, Array<Omit<FestiveCue, "showConfetti">>> = {
  "answer-saved": [
    { copy: "נשמר, איזה כיף", emojis: ["✨", "🎉", "💙"] },
    { copy: "בחירה יפה", emojis: ["🇮🇱", "✨"] },
    { copy: "ממשיכים יחד", emojis: ["🎉", "💙"] },
  ],
  "step-transition": [
    { copy: "ממשיכים לרגע הבא", emojis: ["✨", "🇮🇱"] },
    { copy: "יש עוד רגעים יפים", emojis: ["💙", "✨"] },
  ],
  "photo-chosen": [
    { copy: "עוד רגע יפה מהאירוע", emojis: ["📸", "✨"] },
    { copy: "בחרת רגע ששווה לזכור", emojis: ["📸", "💙"] },
  ],
  "mission-uploaded": [
    { copy: "התמונה עלתה לגלריה", emojis: ["📸", "🎉", "🇮🇱"] },
    { copy: "הרגע הזה כבר איתנו", emojis: ["📸", "✨", "💙"] },
  ],
  "summary-uploaded": [
    { copy: "עוד תמונה הצטרפה לחגיגה", emojis: ["📸", "🎉", "🇮🇱"] },
    { copy: "ממשיכים לשתף רגעים", emojis: ["✨", "💙"] },
  ],
  "summary-finished": [
    { copy: "איזה סיום חגיגי", emojis: ["🇮🇱", "🎉", "🥳"] },
  ],
};

export function getFestiveCue(
  eventName: FestiveEventName,
  iteration: number,
): FestiveCue {
  const variants = cueMap[eventName];
  const variant = variants[Math.abs(iteration) % variants.length];

  const showConfetti =
    eventName === "summary-finished" ||
    ((eventName === "answer-saved" ||
      eventName === "mission-uploaded" ||
      eventName === "summary-uploaded") &&
      (iteration + 1) % 3 === 0);

  return {
    ...variant,
    showConfetti,
  };
}
```

- [ ] **Step 4: Run the script to verify it passes**

Run: `node --import tsx scripts/verify-festive-feedback.ts`

Expected: PASS and output `verify-festive-feedback: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/festive-feedback.ts scripts/verify-festive-feedback.ts
git commit -m "feat: add festive feedback helper"
```

## Task 2: Add Festive Burst UI And Wire It Into The Play Screen

**Files:**
- Create: `src/components/shared/festive-burst.tsx`
- Modify: `src/components/play/play-experience.tsx`
- Modify: `src/lib/sound/generated-sfx.ts`
- Modify: `src/app/globals.css`
- Test: `scripts/verify-mobile-play.ts`

- [ ] **Step 1: Extend the mobile play verification to require festive feedback**

```ts
// append near the answer-selection assertions in scripts/verify-mobile-play.ts
const festiveAccent = await page.locator("[data-festive-accent]").first();
await festiveAccent.waitFor({ state: "visible" });

const festiveMetrics = await page.evaluate(() => {
  const accent = document.querySelector("[data-festive-accent]");
  const confetti = document.querySelector("[data-festive-confetti]");
  const accentRect = accent?.getBoundingClientRect() ?? null;
  const confettiRect = confetti?.getBoundingClientRect() ?? null;

  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    accentRect: accentRect
      ? {
          left: Math.round(accentRect.left),
          right: Math.round(accentRect.right),
        }
      : null,
    confettiRect: confettiRect
      ? {
          left: Math.round(confettiRect.left),
          right: Math.round(confettiRect.right),
        }
      : null,
  };
});

assert.ok(festiveMetrics.accentRect, "Expected a festive accent after answer save");
assert.equal(
  festiveMetrics.scrollWidth,
  festiveMetrics.clientWidth,
  "Expected festive feedback to avoid horizontal overflow",
);
```

- [ ] **Step 2: Run the script to verify it fails**

Run: `node --import tsx scripts/verify-mobile-play.ts`

Expected: FAIL because `[data-festive-accent]` does not exist yet.

- [ ] **Step 3: Create the shared festive burst component and styles**

```tsx
// src/components/shared/festive-burst.tsx
"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";

import type { FestiveCue } from "@/lib/game/festive-feedback";

type FestiveBurstProps = {
  cue: FestiveCue | null;
  scopeKey: string;
};

export function FestiveBurst({ cue, scopeKey }: FestiveBurstProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: cue?.showConfetti ? 8 : 0 }, (_, index) => ({
        id: `${scopeKey}-${index}`,
        delay: index * 0.04,
        rotate: -16 + index * 6,
      })),
    [cue?.showConfetti, scopeKey],
  );

  return (
    <AnimatePresence mode="wait">
      {cue ? (
        <motion.div
          key={`${scopeKey}-${cue.copy}`}
          className="festive-burst"
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div data-festive-accent className="festive-chip">
            <span className="festive-chip-copy">{cue.copy}</span>
            <span className="festive-chip-emojis">{cue.emojis.join(" ")}</span>
          </div>

          {cue.showConfetti ? (
            <div data-festive-confetti className="festive-confetti" aria-hidden="true">
              {pieces.map((piece) => (
                <motion.span
                  key={piece.id}
                  className="festive-flag-piece"
                  initial={{ opacity: 0, y: -8, x: 0, rotate: piece.rotate }}
                  animate={{ opacity: [0, 1, 0], y: [0, 22, 54], x: [0, 8, -10] }}
                  transition={{ duration: 0.9, delay: piece.delay, ease: "easeOut" }}
                />
              ))}
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

```css
/* append to src/app/globals.css */
.festive-burst {
  position: relative;
  margin-top: 1rem;
  overflow: clip;
  pointer-events: none;
}

.festive-chip {
  display: inline-flex;
  max-width: min(100%, 22rem);
  align-items: center;
  gap: 0.6rem;
  border: 1px solid rgba(148, 219, 255, 0.24);
  background: linear-gradient(180deg, rgba(14, 42, 69, 0.94), rgba(8, 27, 47, 0.92));
  box-shadow: 0 20px 44px rgba(41, 128, 185, 0.18);
  border-radius: 999px;
  padding: 0.7rem 1rem;
  color: #f5fbff;
}

.festive-confetti {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 5rem;
  overflow: clip;
}

.festive-flag-piece {
  position: absolute;
  top: 0;
  width: 0.8rem;
  height: 0.55rem;
  border-radius: 0.2rem;
  background:
    linear-gradient(180deg, #ffffff 0 25%, #2b75d6 25% 38%, #ffffff 38% 62%, #2b75d6 62% 75%, #ffffff 75% 100%);
}

@media (prefers-reduced-motion: reduce) {
  .festive-burst,
  .festive-confetti {
    display: none;
  }
}
```

- [ ] **Step 4: Wire cues into `PlayExperience` and retune the matching sounds**

```tsx
// add inside src/components/play/play-experience.tsx
import { FestiveBurst } from "@/components/shared/festive-burst";
import { getFestiveCue, type FestiveEventName } from "@/lib/game/festive-feedback";

const [festiveCue, setFestiveCue] = useState<ReturnType<typeof getFestiveCue> | null>(null);
const festiveSequenceRef = useRef<Record<FestiveEventName, number>>({
  "answer-saved": 0,
  "step-transition": 0,
  "photo-chosen": 0,
  "mission-uploaded": 0,
  "summary-uploaded": 0,
  "summary-finished": 0,
});
const didMountStepRef = useRef(false);

const showFestiveCue = (eventName: FestiveEventName) => {
  const iteration = festiveSequenceRef.current[eventName];
  festiveSequenceRef.current[eventName] = iteration + 1;
  setFestiveCue(getFestiveCue(eventName, iteration));
};

useEffect(() => {
  setFestiveCue(null);

  if (!didMountStepRef.current) {
    didMountStepRef.current = true;
    return;
  }

  showFestiveCue("step-transition");
}, [currentStepKey]);

// answer save success
setConfirmedOptionId(optionId);
setPendingSessionAfterReview(result.session);
setAwaitingContinue(true);
showFestiveCue("answer-saved");
play(result.outcome.rankImproved ? "rankUp" : "points");

// photo choose
setPreviewUrl(nextPreviewUrl);
showFestiveCue("photo-chosen");
play("photo");

// mission upload success
showFestiveCue("mission-uploaded");
play("upload");

// summary completion
if (nextSession.player.completed) {
  play("celebration");
  router.push("/summary");
  return;
}
```

```tsx
// render inside both question and mission sections in src/components/play/play-experience.tsx
<FestiveBurst cue={festiveCue} scopeKey={currentStepKey} />
```

```ts
// adjust the warmer entries in src/lib/sound/generated-sfx.ts
points: {
  volume: 0.78,
  tones: [
    { start: 0, duration: 0.06, frequency: 740, endFrequency: 910, gain: 0.1, waveform: "triangle" },
    { start: 0.035, duration: 0.11, frequency: 1040, endFrequency: 1240, gain: 0.08, waveform: "sine" },
    { start: 0.01, duration: 0.022, frequency: 1320, gain: 0.02, waveform: "noise", attack: 0.001, release: 0.02 },
  ],
},
transition: {
  volume: 0.74,
  tones: [
    { start: 0, duration: 0.14, frequency: 410, endFrequency: 560, gain: 0.11, waveform: "sine", release: 0.1 },
    { start: 0.025, duration: 0.2, frequency: 560, endFrequency: 710, gain: 0.12, waveform: "triangle", release: 0.12 },
    { start: 0.07, duration: 0.16, frequency: 930, endFrequency: 760, gain: 0.05, waveform: "sine", tremoloRate: 7, tremoloDepth: 0.1 },
  ],
},
upload: {
  volume: 0.82,
  tones: [
    { start: 0, duration: 0.08, frequency: 520, endFrequency: 650, gain: 0.11, waveform: "triangle" },
    { start: 0.04, duration: 0.14, frequency: 690, endFrequency: 880, gain: 0.1, waveform: "sine" },
    { start: 0.08, duration: 0.16, frequency: 980, endFrequency: 1180, gain: 0.06, waveform: "triangle" },
  ],
},
```

- [ ] **Step 5: Run the updated play verification**

Run: `node --import tsx scripts/verify-mobile-play.ts`

Expected: PASS and output `verify-mobile-play: PASS`

- [ ] **Step 6: Commit**

```bash
git add src/components/shared/festive-burst.tsx src/components/play/play-experience.tsx src/lib/sound/generated-sfx.ts src/app/globals.css scripts/verify-mobile-play.ts
git commit -m "feat: add festive play feedback"
```

## Task 3: Add Repeated Extra-Photo Uploads To The Summary Screen

**Files:**
- Create: `src/components/summary/summary-extra-photo-form.tsx`
- Modify: `src/components/summary/summary-page.tsx`
- Test: `scripts/verify-summary-extra-photo.ts`

- [ ] **Step 1: Write the failing summary upload verification**

```ts
// scripts/verify-summary-extra-photo.ts
import assert from "node:assert/strict";
import path from "node:path";

import { chromium, devices } from "playwright";

const baseUrl = process.env.VERIFY_BASE_URL || "http://127.0.0.1:3000";
const playerId = "summary-extra-photo-test";
const fixturePath = path.join(process.cwd(), "public", "branding", "home-hero-bg-custom.png");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  const uploadedCaptions: string[] = [];

  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: "kochav-michael-active-player", value: playerId },
  );

  await page.route("**/api/game/summary?*", async (route) => {
    await route.fulfill({
      json: {
        summary: {
          player: {
            id: playerId,
            name: "Summary Test",
            participantType: "solo_female",
            questionOrder: [],
            missionOrder: [],
            currentStepIndex: 26,
            totalScore: 0,
            correctAnswers: 0,
            photoMissionsCompleted: 6,
            newPeopleMet: 8,
            comboStreak: 0,
            completed: true,
            completedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
            lastRank: null,
          },
          rank: 1,
          totalPlayers: 1,
          settings: {
            introText: "",
            prizeLabels: { first: "", second: "", third: "" },
            globalSoundEnabled: true,
          },
          leaderboard: [],
          survey: { playerId, completed: true, questionResults: [] },
        },
      },
    });
  });

  await page.route("**/api/game/extra-photo", async (route) => {
    const body = JSON.parse(route.request().postData() ?? "{}");
    uploadedCaptions.push(body.caption);
    await route.fulfill({
      json: {
        photo: {
          id: `${uploadedCaptions.length}`,
          playerId,
          playerName: "Summary Test",
          missionId: "bonus-gallery",
          missionTitle: "רגעים נוספים מהערב",
          caption: body.caption,
          photoUrl: body.photoUrl,
          thumbnailUrl: body.thumbnailUrl,
          hidden: false,
          createdAt: new Date().toISOString(),
          isFinalMission: false,
        },
      },
    });
  });

  await page.goto(`${baseUrl}/summary`, { waitUntil: "networkidle" });
  await page.setInputFiles('[data-summary-extra-file-input]', fixturePath);
  await page.locator('[data-summary-extra-caption]').fill("רגע ראשון מהסיום");
  await page.locator('[data-summary-extra-submit]').click();
  await page.locator('[data-summary-extra-item]').first().waitFor();

  await page.setInputFiles('[data-summary-extra-file-input]', fixturePath);
  await page.locator('[data-summary-extra-caption]').fill("עוד תמונה חגיגית");
  await page.locator('[data-summary-extra-submit]').click();
  await page.locator('[data-summary-extra-item]').nth(1).waitFor();

  const itemCount = await page.locator('[data-summary-extra-item]').count();
  const successText = await page.locator('[data-summary-extra-success]').textContent();

  await browser.close();

  assert.deepEqual(uploadedCaptions, ["רגע ראשון מהסיום", "עוד תמונה חגיגית"]);
  assert.equal(itemCount, 2);
  assert.match(successText ?? "", /עוד תמונה הצטרפה|ממשיכים לשתף/);

  console.log("verify-summary-extra-photo: PASS");
}

void main();
```

- [ ] **Step 2: Run the script to verify it fails**

Run: `node --import tsx scripts/verify-summary-extra-photo.ts`

Expected: FAIL because the summary screen does not yet expose the extra-photo form selectors.

- [ ] **Step 3: Build the summary upload component and mount it**

```tsx
// src/components/summary/summary-extra-photo-form.tsx
"use client";

import Image from "next/image";
import { Camera, LoaderCircle, Sparkles } from "lucide-react";
import { useRef, useState } from "react";

import { FestiveBurst } from "@/components/shared/festive-burst";
import { useSound } from "@/components/shared/sound-provider";
import { getFestiveCue } from "@/lib/game/festive-feedback";
import { compressForUpload } from "@/lib/utils/image-upload";
import { getStoredPlayerId } from "@/lib/utils/local-session";

type UploadedExtraPhoto = {
  id: string;
  caption: string | null;
  photoUrl: string;
  thumbnailUrl: string | null;
  createdAt: string;
};

export function SummaryExtraPhotoForm() {
  const { play } = useSound();
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadedExtraPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cue, setCue] = useState<ReturnType<typeof getFestiveCue> | null>(null);
  const uploadCountRef = useRef(0);

  const submit = async () => {
    const playerId = getStoredPlayerId();
    if (!playerId || !selectedFile) {
      setError("צריך לבחור תמונה כדי להמשיך");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const compressed = await compressForUpload(selectedFile);
      const response = await fetch("/api/game/extra-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          caption,
          photoUrl: compressed.photoUrl,
          thumbnailUrl: compressed.thumbnailUrl,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "upload");
      }

      const json = (await response.json()) as { photo: UploadedExtraPhoto };
      setUploads((current) => [json.photo, ...current]);
      setCaption("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccess("עוד תמונה הצטרפה לחגיגה");
      setCue(getFestiveCue("summary-uploaded", uploadCountRef.current));
      uploadCountRef.current += 1;
      play("upload");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "לא הצלחנו לשמור את התמונה כרגע",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="stage-panel-soft rounded-[34px] p-6 sm:p-8">
      <div className="section-kicker">
        <Sparkles size={14} />
        ממשיכים לשתף רגעים מהערב
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[24px] border border-white/10 bg-white/6 p-3">
          <div className="relative h-[240px] overflow-hidden rounded-[20px] bg-[#08172d]">
            {previewUrl ? (
              <Image src={previewUrl} alt="תצוגה מקדימה לתמונה נוספת" fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-[var(--text-soft)]">
                בוחרים רגע יפה ומוסיפים לו משפט קצר
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <label className="hero-button-secondary inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[22px] px-5 text-white">
            <Camera size={18} />
            בחרו תמונה נוספת
            <input
              data-summary-extra-file-input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedFile(file);
                setPreviewUrl(file ? URL.createObjectURL(file) : null);
                setCue(getFestiveCue("photo-chosen", uploads.length));
                play("photo");
              }}
            />
          </label>

          <textarea
            data-summary-extra-caption
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={4}
            className="stage-panel-soft w-full rounded-[24px] px-4 py-4 text-right text-white"
            placeholder="מה רואים כאן? משפט קצר מספיק"
          />

          <button
            data-summary-extra-submit
            type="button"
            disabled={busy}
            onClick={submit}
            className="hero-button-primary inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px]"
          >
            {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Camera size={18} />}
            הוספת התמונה לגלריה
          </button>

          {success ? (
            <p data-summary-extra-success className="text-sm text-[#d7f4ff]">
              {success}
            </p>
          ) : null}
          {error ? <p className="text-sm text-[#ffd9d9]">{error}</p> : null}

          <FestiveBurst cue={cue} scopeKey={`summary-extra-${uploads.length}`} />
        </div>
      </div>

      {uploads.length > 0 ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {uploads.map((photo) => (
            <article key={photo.id} data-summary-extra-item className="rounded-[24px] border border-white/10 bg-white/6 p-3">
              <div className="relative h-36 overflow-hidden rounded-[18px]">
                <Image src={photo.thumbnailUrl || photo.photoUrl} alt={photo.caption || "תמונה נוספת"} fill className="object-cover" />
              </div>
              {photo.caption ? <p className="mt-3 text-sm text-[var(--text-soft)]">{photo.caption}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
```

```tsx
// import and render inside src/components/summary/summary-page.tsx
import { SummaryExtraPhotoForm } from "@/components/summary/summary-extra-photo-form";
import { FestiveBurst } from "@/components/shared/festive-burst";
import { getFestiveCue } from "@/lib/game/festive-feedback";

const [summaryCue, setSummaryCue] = useState<ReturnType<typeof getFestiveCue> | null>(null);

// render after <SurveyResultsList ... />
<SummaryExtraPhotoForm />

// set after summary fetch succeeds
setSummary(json.summary);
setGlobalSoundEnabled(json.summary.settings.globalSoundEnabled);
setSummaryCue(getFestiveCue("summary-finished", 0));
play("celebration");

// render near the summary hero section
<FestiveBurst cue={summaryCue} scopeKey="summary-finished" />
```

- [ ] **Step 4: Run the summary upload verification**

Run: `node --import tsx scripts/verify-summary-extra-photo.ts`

Expected: PASS and output `verify-summary-extra-photo: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/components/summary/summary-page.tsx src/components/summary/summary-extra-photo-form.tsx scripts/verify-summary-extra-photo.ts
git commit -m "feat: add summary extra photo uploads"
```

## Task 4: Full Verification And Production Deployment

**Files:**
- Modify: `scripts/verify-mobile-play.ts` (already updated in Task 2)
- Create: `scripts/verify-summary-extra-photo.ts` (already added in Task 3)

- [ ] **Step 1: Run focused local verification**

Run:

```bash
node --import tsx scripts/verify-festive-feedback.ts
node --import tsx scripts/verify-mobile-play.ts
node --import tsx scripts/verify-summary-extra-photo.ts
npm run typecheck
npx eslint src/components/play/play-experience.tsx src/components/shared/festive-burst.tsx src/components/summary/summary-page.tsx src/components/summary/summary-extra-photo-form.tsx src/lib/game/festive-feedback.ts src/lib/sound/generated-sfx.ts scripts/verify-festive-feedback.ts scripts/verify-mobile-play.ts scripts/verify-summary-extra-photo.ts
```

Expected:

- `verify-festive-feedback: PASS`
- `verify-mobile-play: PASS`
- `verify-summary-extra-photo: PASS`
- `npm run typecheck` exits `0`
- `eslint` exits `0`

- [ ] **Step 2: Run a production build smoke check**

Run: `npm run build`

Expected: Next.js production build succeeds with exit code `0`.

- [ ] **Step 3: Deploy to production**

Run: `npx vercel --prod --yes`

Expected: successful deployment with the production alias `https://kochav-michael-game.vercel.app`

- [ ] **Step 4: Re-run production verification**

Run:

```bash
VERIFY_BASE_URL=https://kochav-michael-game.vercel.app node --import tsx scripts/verify-mobile-home.ts
VERIFY_BASE_URL=https://kochav-michael-game.vercel.app node --import tsx scripts/verify-mobile-play.ts
VERIFY_BASE_URL=https://kochav-michael-game.vercel.app node --import tsx scripts/verify-summary-extra-photo.ts
VERIFY_BASE_URL=https://kochav-michael-game.vercel.app node --import tsx scripts/verify-sound-playback.ts
```

Expected:

- `verify-mobile-home: PASS`
- `verify-mobile-play: PASS`
- `verify-summary-extra-photo: PASS`
- `verify-sound-playback: PASS`

- [ ] **Step 5: Commit**

```bash
git add src/components/play/play-experience.tsx src/components/shared/festive-burst.tsx src/components/summary/summary-page.tsx src/components/summary/summary-extra-photo-form.tsx src/lib/game/festive-feedback.ts src/lib/sound/generated-sfx.ts src/app/globals.css scripts/verify-festive-feedback.ts scripts/verify-mobile-play.ts scripts/verify-summary-extra-photo.ts docs/superpowers/plans/2026-04-19-festive-play-and-postgame-gallery-plan.md
git commit -m "feat: add festive play and postgame gallery"
```
