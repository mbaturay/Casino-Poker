# Jacks or Better — Video Poker (Vite + React + TypeScript)

A fast, single-screen Jacks or Better built with Vite + React + TypeScript.

## Features
- Vite + React + TypeScript setup
- Public card SVGs served from `/cards` (e.g., `/cards/AS.svg`)
- Core gameplay: Deal → Hold → Draw → Payout
- Machine-style controls: Bet One (1→5→1), Max Bet, Deal/Draw
- Per-card Hold/Cancel under each card (or click the card)
- Paytable modal with active hand/column highlighting
- Keyboard shortcuts throughout (see below)
- Credits and Bet persisted to `localStorage`
- Polished card flips and small transition animations
- Double-or-Nothing bonus: five facedown cards, guess Red/Black in sequence
  - Doubles on each correct guess; Collect available after each success
  - At 5/5 perfect run, the final doubled amount is doubled again (×2 final)

## Keyboard shortcuts
- Global
  - Space: Deal/Draw
  - 1–5: Toggle HOLD (draw stage)
- Bonus offer (after a win)
  - Y: Yes (start bonus)
  - N: No (collect)
- Bonus game
  - R: Red, B: Black, C: Collect
- Bet (while idle on bet stage)
  - +: Bet One, M: Max Bet

## Scripts
- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build locally

## Project structure (excerpt)
```
public/
  cards/           # SVG assets
src/
  App.tsx
  VideoPoker.tsx   # game logic + UI
  main.tsx
  styles.css
index.html
```

## Dev notes
- Node.js 18+ recommended.
- Assets
  - Playing cards live under `public/cards` and are referenced as `/cards/<CODE>.svg`.
  - App logo is at `public/img/JacksOrBetter.png`.
- Optional debug panel (development or `?debug=1`):
  - Force a bonus offer with a chosen base payout
  - Start the 5-card bonus with a specified R/B pattern for testing