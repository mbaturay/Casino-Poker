# How to Play — Jacks or Better

This is a classic Jacks or Better video poker with a Double-or-Nothing bonus.

## Objective
Build the best 5‑card poker hand. Payouts follow the paytable, with a bonus gamble option after each win.

## Game flow
1. Set your bet (1–5 credits).
2. Deal: You receive 5 cards.
3. Hold: Choose which cards to keep.
4. Draw: Replaces non‑held cards, forming your final hand.
5. Payout: If you win (Jacks or Better or higher), you can Collect or try the Double‑or‑Nothing bonus.

## Controls
- Buttons
  - Bet One: Cycles bet 1 → 5 → 1 (bet stage only)
  - Max Bet: Sets bet to 5 (bet stage only)
  - Deal/Draw: Starts a hand or completes the draw
  - Bonus (during Double‑or‑Nothing): Red, Black, Collect
- Keyboard
  - Space: Deal/Draw
  - 1–5: Toggle HOLD (during draw)
  - Y: Accept bonus offer (start bonus)
  - N: Decline bonus offer (collect)
  - R: Red, B: Black, C: Collect (bonus)
  - +: Bet One, M: Max Bet (bet stage)

## Paytable (excerpt)
- Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight,
  Three of a Kind, Two Pair, Jacks or Better.
- Payouts scale with bet (1–5). See the in‑game Paytable for full values.

## Double‑or‑Nothing bonus
- After a win, you may gamble the winnings.
- Five facedown cards appear. Guess Red or Black sequentially:
  - Each correct guess doubles your current winnings.
  - After each correct guess, you may Collect.
  - If you reach 5/5 correct (perfect), your final doubled amount is doubled again (×2 final) automatically.
  - A wrong guess loses the bonus winnings and returns to the main game.

## Tips
- Use 1–5 keys to toggle holds quickly during the draw.
- If you don’t want to gamble a win, press N on the bonus offer screen to Collect.
- The bonus ladder shows actual credit amounts you can reach starting from your base win.

## Assets
- Playing cards are SVGs in `public/cards` and are referenced as `/cards/<CODE>.svg`.
- App logo is `public/img/JacksOrBetter.png`.
