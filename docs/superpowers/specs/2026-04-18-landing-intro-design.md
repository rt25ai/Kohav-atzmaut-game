# Landing Intro Design

Date: 2026-04-18
Status: Draft for user review

## Goal

Add a short, memorable entrance effect when visitors arrive at the home page so the site opens with a clear "wow" moment before the existing landing screen appears.

The intro should feel festive and ceremonial, built around the new branded image, but remain lightweight enough that it does not feel like a separate feature or slow down the actual game flow.

## Confirmed Requirements

- Show the intro on every visit to the site home page, including when a visitor leaves and comes back later.
- The intro is mandatory and lasts `1.5s`.
- The intro appears before the main landing screen.
- The chosen visual direction is `A. ceremonial glowing entrance` (internal label: `טקס כניסה זוהר`).
- The purpose is a short `WOW` entry effect, not a new onboarding flow.

## Non-Goals

- No intro on gameplay, summary, leaderboard, gallery, or admin pages.
- No skip button.
- No extra user decisions, copy-heavy splash screen, or secondary CTA during the intro.
- No long particle simulation or noisy fireworks effect.

## Experience Summary

When a visitor opens `/`, the landing page mounts as usual but is covered by a full-screen intro overlay. For `1.5s`, the visitor sees a ceremonial reveal built around the new image: a dark blue stage, a soft white-gold glow, a circular light ring, and the branded image entering with a refined scale-and-focus motion. At the end of the sequence, the overlay fades away and slightly lifts upward while the existing landing hero becomes visible underneath.

The effect should read as premium and celebratory, not chaotic. It should feel closer to a ceremonial reveal than to a game loading screen.

## Visual Thesis

Midnight-blue stage, white-gold light, and a centered emblem reveal that feels festive, polished, and brief.

## Content Plan

1. Intro overlay only: the branded image is the dominant element.
2. Existing landing page remains untouched underneath and becomes visible at the end of the sequence.

## Interaction Thesis

- A soft halo blooms first to establish anticipation.
- The image arrives with a crisp ceremonial reveal rather than a fast pop.
- The overlay exits upward with a gentle fade so the landing page feels "uncovered."

## Placement and Scope

The intro runs only on the home page route and only before the existing landing content at [src/components/landing/landing-page.tsx](c:/Users/roita/Kohav-atzmaut-game/Kohav-atzmaut-game/src/components/landing/landing-page.tsx:24).

It should not be implemented globally in [src/components/shared/app-shell.tsx](c:/Users/roita/Kohav-atzmaut-game/Kohav-atzmaut-game/src/components/shared/app-shell.tsx:7), because that would replay the effect on internal app pages and interrupt actual game usage.

## Motion Sequence

Total duration: `1500ms`

### Phase 1: Stage Build (`0ms-350ms`)

- A full-screen dark blue overlay is already present.
- A radial white-gold glow blooms from the center.
- A circular ring expands softly around the image position.

### Phase 2: Emblem Reveal (`200ms-900ms`)

- The branded image begins small, slightly blurred, and slightly rotated.
- It scales into place, sharpens quickly, and settles in the center.
- Motion should feel precise and celebratory, not bouncy or comic.

### Phase 3: Hold (`900ms-1200ms`)

- The image remains clearly visible for a short beat.
- Glow and ring calm down so the viewer gets a clean read of the image.

### Phase 4: Uncover Landing (`1200ms-1500ms`)

- The overlay fades out.
- The image and light treatment drift slightly upward as they disappear.
- The home page content is revealed underneath without a hard cut.

## Technical Design

### Component Structure

Add a dedicated client component, tentatively `LandingIntroOverlay`, that:

- renders only on the landing page
- owns the `1500ms` timer
- blocks interaction while visible
- unmounts completely when finished

Suggested structure:

- `LandingPage`
- `LandingIntroOverlay`
- existing landing content

The overlay should be rendered from inside the landing page component so the scope stays local to `/`.

### State and Lifecycle

- Start with the intro visible on mount.
- Use a single timer to hide it after `1500ms`.
- Clear the timer on unmount.
- Once hidden, remove the overlay from the DOM instead of leaving an invisible layer behind.

### Rendering Strategy

- Keep the existing landing page rendered underneath from the beginning.
- Use a fixed overlay with a high `z-index`.
- Use `pointer-events: auto` on the overlay while active and remove it entirely after completion.

This avoids a second loading step and makes the reveal feel smooth and immediate.

### Assets

Use the new branded image introduced in the meta/favicon change. The intro should use `public/branding/site-icon.png`, not the heavier social-preview asset.

## Styling Direction

- Base background: deep blue / navy
- Accent light: white-gold glow
- Shape language: circular halo and ring
- Image treatment: centered, isolated, elevated with restrained shadow
- No extra text is required inside the intro

The overlay should visually relate to the current landing hero palette so the transition into the page feels intentional instead of disconnected.

## Accessibility and UX

- The intro is intentionally mandatory for `1.5s`.
- Because it is short and decorative, keep the content simple and avoid flashing/high-frequency motion.
- Respect legibility and avoid exposing interactive controls until the overlay is gone.
- The landing page content underneath should remain structurally unchanged.

## Performance Constraints

- Keep the animation to a small number of moving layers: background glow, ring, and main image.
- Avoid expensive particle systems or large numbers of DOM nodes.
- Reuse existing dependencies, especially `framer-motion`, already used in the landing page.
- Prefer transform and opacity animations over layout-affecting properties.

## Testing and Verification

Verify the following after implementation:

- Opening `/` always shows the intro on a fresh page load.
- The intro lasts about `1.5s`.
- Internal navigation to gameplay and other pages does not show the intro.
- The landing page becomes fully interactive after the overlay disappears.
- The image remains crisp and centered on mobile and desktop.
- `npm run build` succeeds.

## Risks and Mitigations

### Risk: The effect feels repetitive on repeat visits

Mitigation: keep the sequence short, elegant, and visually clean instead of loud or overcomplicated.

### Risk: The overlay blocks interaction after it ends

Mitigation: fully unmount the overlay after the timer instead of relying on hidden opacity only.

### Risk: The intro feels disconnected from the landing screen

Mitigation: use the same color family as the landing hero and reveal the page underneath rather than cutting to it.

## Implementation Boundary

This work covers only the home-page intro overlay and its transition into the existing landing screen. It does not include broader landing redesign, navigation changes, or route-level transition systems across the rest of the app.
