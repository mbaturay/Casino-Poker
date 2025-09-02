# Jacks or Better — Video Poker (Vite + React + TypeScript)

A minimal, fast Video Poker game built with Vite + React + TypeScript.

## Features
- Vite + React + TypeScript setup
- Public card SVGs served from `/cards` (e.g., `/cards/AS.svg`)
- Video Poker gameplay (Deal → Hold → Draw → Payout)
- Machine-style controls: Bet One (cycles 1→5→1), Max Bet, Deal/Draw
- Hold/Cancel buttons centered under each card (or click card to toggle)
- Paytable shown via modal on demand
- Winnings shown via modal (CTA after a win)
- Keyboard shortcuts: Space = Deal/Draw; 1–5 toggle holds (draw stage)
- Credits and Bet persisted to `localStorage`
- Simple 3D flip animations on deal/draw

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

## Notes
- Requires Node.js 18+ recommended.
- If assets don’t show, ensure they live under `public/cards` and reference them as `/cards/<CODE>.svg`.