# One-Button Roguelite Reflex

A neon-glitch arcade reflex game controlled with a **single button** — click, tap, or spacebar. Every round throws a random micro-challenge at you (press in time, don't press, catch the moment, burst-press, hold & release), the reaction window shrinks as you go, and one mistake ends the run.

**Play it here: https://aleksander1sk.github.io/one-button-roguelite-reflex/**

## Features

- **One input for everything** — designed mobile-first: perfect for touch play
- **Roguelite meta-progression** — earn shards each run, unlock two extra challenge types and a shield that forgives one mistake
- **Procedural retro/glitch art** — CRT scanlines, scrolling neon grid that speeds up with difficulty, glitch bursts and RGB-split on failure; zero image assets
- **Procedural WebAudio sound** — every cue synthesized at runtime; zero audio assets
- **8 languages** — EN, UK, ES, PT, DE, FR, PL, TR, auto-detected from the browser
- **Tiny footprint** — a single HTML file plus one JS file; Phaser 3 via CDN

## Controls

| Prompt | What to do |
|---|---|
| `PRESS!` | Press as fast as you can |
| `DON'T PRESS` | Hold your nerve, do nothing |
| `CATCH THE MOMENT` | Press when the marker is in the center |
| `PRESS x5` | Burst-press five times in time |
| `HOLD DOWN` | Hold, then release inside the zone |

## Run locally

```
npm run dev     # serves on http://localhost:3000 (or open index.html directly)
```

## Test

Headless end-to-end suite (requires Chrome installed):

```
npm i
npm run dev     # in another terminal, on port 8123: npx serve -l 8123 .
npm test
```

27 checks across three scenarios: full game flow with the portal SDK blocked (adblock resilience), real SDK in dev mode, and locale detection.

## Tech

Phaser 3, vanilla JavaScript, no build step. Poki SDK integrated behind a fallback wrapper — the game is fully playable without it.
