import { useMemo, useState, useEffect, useRef } from "react";

type Suit = "S" | "H" | "D" | "C";
type Rank = 2|3|4|5|6|7|8|9|10|"J"|"Q"|"K"|"A";
type Stage = "bet" | "draw" | "payout" | "bonus-offer" | "bonus";
type HandRank =
  | "Royal Flush" | "Straight Flush" | "Four of a Kind" | "Full House"
  | "Flush" | "Straight" | "Three of a Kind" | "Two Pair" | "Jacks or Better" | "No Win";

interface Card { rank: Rank; suit: Suit; }

const cardCode = (c: Card) => `${typeof c.rank === "number" ? c.rank : c.rank}${c.suit}`;
const buildDeck = (): Card[] => {
  const suits: Suit[] = ["S","H","D","C"];
  const ranks: Rank[] = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"];
  const deck: Card[] = [];
  for (const s of suits) for (const r of ranks) deck.push({ rank: r, suit: s });
  return deck;
};
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const rankVal = (r: Rank) =>
  typeof r === "number" ? r : r === "A" ? 14 : r === "K" ? 13 : r === "Q" ? 12 : 11;

function evaluateHand(cards: Card[]): { name: HandRank } {
  const ranks = cards.map(c => rankVal(c.rank)).sort((a,b)=>a-b);
  const suits = cards.map(c => c.suit);
  const counts: Record<number, number> = {};
  for (const v of ranks) counts[v] = (counts[v] || 0) + 1;
  const countVals = Object.values(counts).sort((a,b)=>b-a);
  const isFlush = suits.every(s => s === suits[0]);
  const isWheel = JSON.stringify(ranks) === JSON.stringify([2,3,4,5,14]);
  const isSeq = isWheel || ranks.every((v,i,a)=> i===0 || v - a[i-1] === 1);
  const isRoyal = isFlush && !isWheel && ranks[0]===10 && ranks[4]===14;

  if (isFlush && isSeq) return { name: isRoyal ? "Royal Flush" : "Straight Flush" };
  if (countVals[0] === 4) return { name: "Four of a Kind" };
  if (countVals[0] === 3 && countVals[1] === 2) return { name: "Full House" };
  if (isFlush) return { name: "Flush" };
  if (isSeq) return { name: "Straight" };
  if (countVals[0] === 3) return { name: "Three of a Kind" };
  if (countVals[0] === 2 && countVals[1] === 2) return { name: "Two Pair" };
  if (countVals[0] === 2) {
    const pairRank = Number(Object.keys(counts).find(k => counts[Number(k)]===2));
    if (pairRank >= 11 || pairRank === 14) return { name: "Jacks or Better" };
  }
  return { name: "No Win" };
}

const PAYTABLE: Record<HandRank, number[]> = {
  "Royal Flush": [250, 500, 750, 1000, 4000],
  "Straight Flush": [50, 100, 150, 200, 250],
  "Four of a Kind": [25, 50, 75, 100, 125],
  "Full House": [9, 18, 27, 36, 45],
  "Flush": [6, 12, 18, 24, 30],
  "Straight": [4, 8, 12, 16, 20],
  "Three of a Kind": [3, 6, 9, 12, 15],
  "Two Pair": [2, 4, 6, 8, 10],
  "Jacks or Better": [1, 2, 3, 4, 5],
  "No Win": [0, 0, 0, 0, 0],
};

export default function VideoPoker() {
  const [credits, setCredits] = useState<number>(() => {
    const v = localStorage.getItem("vp-credits");
    const n = v != null ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : 200;
  });
  const [bet, setBet] = useState<number>(() => {
    const v = localStorage.getItem("vp-bet");
    const n = v != null ? parseInt(v, 10) : NaN;
    if (!Number.isFinite(n)) return 5;
    return Math.min(5, Math.max(1, n));
  });
  const [stage, setStage] = useState<Stage>("bet");
  const [deck, setDeck] = useState<Card[]>(() => shuffle(buildDeck()));
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState<boolean[]>([false,false,false,false,false]);
  const [message, setMessage] = useState("Place your bet and deal");
  const [winDetails, setWinDetails] = useState<{ name: HandRank; payout: number } | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [showPaytable, setShowPaytable] = useState(false);
  const [flipped, setFlipped] = useState<boolean[]>([false,false,false,false,false]);
  const flipTimers = useRef<number[]>([]);
  const [showOutOfCredits, setShowOutOfCredits] = useState(false);
  // Bonus mini-game state
  const [pendingWin, setPendingWin] = useState<number>(0); // winnings available to gamble/collect
  const [bonusCard, setBonusCard] = useState<Card | null>(null);
  // no 3D flip in bonus anymore
  const [showBonusOffer, setShowBonusOffer] = useState<boolean>(false);
  // removed continue modal; no longer needed
  const [canCollect, setCanCollect] = useState<boolean>(false);
  // UI transition animation flags
  const [animCardsOut, setAnimCardsOut] = useState(false);
  const [animCardsIn, setAnimCardsIn] = useState(false);
  const [animBonusIn, setAnimBonusIn] = useState(false);
  const [animBonusOut, setAnimBonusOut] = useState(false);
  // concurrent transition helpers
  const [outHand, setOutHand] = useState<Card[] | null>(null); // snapshot of 5-card hand to animate out
  const [animCardsOutSeqLeft, setAnimCardsOutSeqLeft] = useState(false); // per-card slide left with stagger
  const [animBonusInRight, setAnimBonusInRight] = useState(false);
  // hide the base 5-card grid during the outgoing animation to prevent double visuals
  const [hideMainCards, setHideMainCards] = useState(false);
  // duration for overlay fade-out
  const [outFadeMs, setOutFadeMs] = useState<number>(800);
  // machine bar fades
  const [barFadeOut, setBarFadeOut] = useState(false);
  const [barFadeIn, setBarFadeIn] = useState(false);

  const FLIP_MS = 350; // single flip duration
  const DEAL_STAGGER_MS = 120; // delay between cards on deal
  const DRAW_STAGGER_MS = 120; // delay between cards on draw
  // UI animation durations (keep in sync with CSS)
  const CARDS_OUT_MS = 350;
  const BONUS_IN_MS = 350;
  const BONUS_OUT_MS = 350;
  const CARDS_IN_MS = 350;
  const BONUS_PAUSE_MS = 1000; // brief hold on revealed card before transitioning
  const BONUS_STAGGER_MS = 120; // per-card slide-out stagger for outgoing hand

  const clearTimers = () => {
    flipTimers.current.forEach(id => clearTimeout(id));
    flipTimers.current = [];
  };

  const result = useMemo(() => hand.length===5 ? evaluateHand(hand) : null, [hand]);

  // persist credits & bet
  useEffect(() => {
    try { localStorage.setItem("vp-credits", String(credits)); } catch {}
  }, [credits]);
  useEffect(() => {
    try { localStorage.setItem("vp-bet", String(bet)); } catch {}
  }, [bet]);

  // Show out-of-credits modal when no credits and we're idle on bet stage
  useEffect(() => {
    if (stage === "bet" && credits <= 0) {
      setShowOutOfCredits(true);
      setMessage("Out of credits. Start a new game.");
    }
  }, [credits, stage]);

  // Ensure bet never exceeds available credits when idle on bet stage
  useEffect(() => {
    if (stage === "bet" && credits > 0 && bet > credits) {
      const nb = Math.min(credits, 5);
      setBet(nb);
    }
  }, [stage, credits, bet]);

  const startNewGame = () => {
    clearTimers();
    setShowOutOfCredits(false);
    setCredits(200);
    setBet(5);
    setDeck(shuffle(buildDeck()));
    setHand([]);
    setHeld([false,false,false,false,false]);
    setFlipped([false,false,false,false,false]);
  setAnimCardsOut(false); setAnimCardsIn(false); setAnimBonusIn(false); setAnimBonusOut(false);
    setStage("bet");
    setMessage("Place your bet and deal");
  };

  const onDeal = () => {
    if (stage !== "bet") return;
  if (credits <= 0) { setShowOutOfCredits(true); setMessage("Out of credits. Start a new game."); return; }
  // Ensure no residual focus outline on cards when starting a new deal
  (document.activeElement as HTMLElement | null)?.blur?.();
    clearTimers();
  // Ensure any prior banners are cleared (we no longer render a banner)
    if (bet < 1 || bet > 5) return;
    if (credits < bet) { setMessage("Not enough credits"); return; }
    setCredits(c => c - bet);
  // Ensure we have enough cards for a full round (up to 10 cards)
  let sourceDeck = deck;
  if (sourceDeck.length < 10) sourceDeck = shuffle(buildDeck());
  const d = [...sourceDeck];
  const newHand = d.splice(0,5);
  // Clear any previous holds BEFORE switching to draw so no held rings flash
  setHeld([false,false,false,false,false]);
  setStage("draw");
    setMessage("Select cards to HOLD, then DRAW");
    // If prior round left cards face-up, flip them to back first for a clean animation
    const hadFaceUp = hand.length === 5 && flipped.some(v => v);
    setFlipped([false,false,false,false,false]); // flip all to back (will animate if they were face-up)
    const backDelay = hadFaceUp ? (FLIP_MS + 100) : 0;

    // After the back flip, swap in the new cards and reveal with staggered flips
    const tSet = window.setTimeout(() => {
      setDeck(d);
      setHand(newHand);
      for (let i = 0; i < 5; i++) {
        const id = window.setTimeout(() => {
          setFlipped(f => f.map((v, idx) => idx === i ? true : v));
        }, i * DEAL_STAGGER_MS);
        flipTimers.current.push(id);
      }
    }, backDelay);
    flipTimers.current.push(tSet);
  };

  const toggleHold = (i: number) => {
    if (stage !== "draw") return;
    setHeld(h => h.map((v, idx) => idx === i ? !v : v));
  };

  const onDraw = () => {
    if (stage !== "draw") return;
  // Remove focus ring from any focused card to keep symmetry
  (document.activeElement as HTMLElement | null)?.blur?.();
    clearTimers();
    const d = [...deck];
  const replacements = hand.map((_, i) => held[i] ? undefined : d.shift()!);
    const finalHand = hand.map((c, i) => held[i] ? c : (replacements[i] as Card));
    setDeck(d);

    // Animate each changed card: flip to back, swap, flip to front
    let lastDelay = 0;
    for (let i = 0; i < 5; i++) {
      if (replacements[i]) {
        const t1 = window.setTimeout(() => {
          setFlipped(f => f.map((v, idx) => idx === i ? false : v));
        }, lastDelay);
        const t2 = window.setTimeout(() => {
          setHand(hh => hh.map((c, idx) => idx === i ? (finalHand[i] as Card) : c));
          setFlipped(f => f.map((v, idx) => idx === i ? true : v));
        }, lastDelay + FLIP_MS);
        flipTimers.current.push(t1, t2);
        lastDelay += DRAW_STAGGER_MS;
      }
  }

    // After animations, compute payout and advance stage
    const totalDelay = lastDelay + FLIP_MS + 10;
    const t3 = window.setTimeout(() => {
      const ev = evaluateHand(finalHand);
      const payout = PAYTABLE[ev.name][bet-1];
      if (payout > 0) {
        setWinDetails({ name: ev.name, payout });
        setPendingWin(payout);
        setMessage(`You win ${payout} credit${payout===1?"":"s"} with a ${ev.name}. Gamble (Red/Black)?`);
        setShowWin(false);
        setShowBonusOffer(true);
        setStage("bonus-offer");
      } else {
        setWinDetails(null);
        setMessage("No win. Try again.");
        // Preserve HOLD labels exactly as the player left them until the next Deal
        // keep the final hand visible so the player can see the result
        setFlipped([true,true,true,true,true]);
        // ensure no lingering slide animations
        setAnimCardsOut(false);
        setAnimCardsIn(false);
        setAnimBonusIn(false);
        setAnimBonusOut(false);
        setStage("bet");
      }
    }, totalDelay);
    flipTimers.current.push(t3);
  };

  // Note: Button bar fades only when entering/exiting bonus. No fades during normal bet/draw stage changes.

  const collectPending = () => {
    const amount = pendingWin;
    if (amount > 0) {
      setCredits(c => c + amount);
      setMessage(`Collected ${amount} credit${amount===1?"":"s"}.`);
    }
    // If we're in the bonus view, animate the bonus card out and bring the 5 backs in
  if (stage === "bonus") {
      // Briefly hold the result on screen, then slide out and return to bet
      setPendingWin(0);
      setBarFadeOut(true);
      const tPause = window.setTimeout(() => {
        setAnimBonusOut(true);
        const t1 = window.setTimeout(() => {
          setAnimBonusOut(false);
          setStage("bet");
          setShowBonusOffer(false);
          setBonusCard(null);
          setCanCollect(false);
          // Restore previous final hand and holds; animate cards back in (face-up)
          setAnimCardsIn(true);
          const t2 = window.setTimeout(() => setAnimCardsIn(false), CARDS_IN_MS);
          // fade bar back in with standard duration
          setBarFadeOut(false);
          setBarFadeIn(true);
          const tBarIn = window.setTimeout(() => setBarFadeIn(false), 450);
          flipTimers.current.push(t2, tBarIn);
        }, BONUS_OUT_MS);
        flipTimers.current.push(t1);
      }, BONUS_PAUSE_MS);
      flipTimers.current.push(tPause);
    } else {
      // Collecting from the offer (No) — no bonus shown; just reset to bet
      setPendingWin(0);
      setShowBonusOffer(false);
  // continue modal removed
      setBonusCard(null);
      
      setStage("bet");
    }
  };

  const startBonus = () => {
    // Hide modal immediately
    setShowBonusOffer(false);
  // Snapshot current 5-card hand and slide each card out left with stagger.
  // Hide the base grid first to avoid any one-frame layout shift.
  setHideMainCards(true);
  setOutHand(hand);
  setAnimCardsOutSeqLeft(true);
    // fade out bar while content will change to bonus controls
    setBarFadeOut(true);

    // After the last card finishes sliding out, then bring in the single back card from the right
    const totalOut = CARDS_OUT_MS + 4 * BONUS_STAGGER_MS;
    setOutFadeMs(totalOut);
    const tOut = window.setTimeout(() => {
      setAnimCardsOutSeqLeft(false);
      setOutHand(null);

      if (deck.length < 1) setDeck(shuffle(buildDeck()));
      setBonusCard(null); // start with back-side
      setCanCollect(false);
      setStage("bonus");
      setHideMainCards(false);
      setAnimBonusInRight(true);
      // swap bar content to bonus and fade in
      setBarFadeOut(false);
      setBarFadeIn(true);
      setMessage(`Gamble ${pendingWin} credit${pendingWin===1?"":"s"}: choose RED or BLACK.`);

      const tIn = window.setTimeout(() => setAnimBonusInRight(false), BONUS_IN_MS);
      const tBarIn = window.setTimeout(() => setBarFadeIn(false), 450);
      flipTimers.current.push(tIn, tBarIn);
    }, totalOut);
    flipTimers.current.push(tOut);
  };

  const onBonusGuess = (choice: "red" | "black") => {
    if (stage !== "bonus") return;
    // draw a card from deck (reshuffle if empty)
    let d = [...deck];
    if (d.length < 1) d = shuffle(buildDeck());
    const card = d.shift()!;
    setDeck(d);
    setBonusCard(card);
    // no flip animation; show revealed card immediately
    const isRed = card.suit === "H" || card.suit === "D";
    const correct = (choice === "red") ? isRed : !isRed;
    const t2 = window.setTimeout(() => {
      if (correct) {
        setPendingWin(prev => {
          const nv = prev * 2;
          setMessage(`Correct! Winnings doubled to ${nv}. Guess again or collect.`);
          return nv;
        });
        setCanCollect(true);
        // slide out the revealed card and bring a new facedown
        const tOut = window.setTimeout(() => {
          setAnimBonusOut(true);
          const tAfterOut = window.setTimeout(() => {
            setAnimBonusOut(false);
            setBonusCard(null);
            
            setAnimBonusIn(true);
            const tAfterIn = window.setTimeout(() => setAnimBonusIn(false), BONUS_IN_MS);
            flipTimers.current.push(tAfterIn);
          }, BONUS_OUT_MS);
          flipTimers.current.push(tAfterOut);
        }, BONUS_PAUSE_MS);
        flipTimers.current.push(tOut);
      } else {
        setMessage("Wrong! You lost the bonus winnings.");
        setPendingWin(0);
        // continue modal removed
        // Hold on the revealed card briefly, then animate out and return to bet with prior hand visible
        const tPauseLose = window.setTimeout(() => {
          setBarFadeOut(true);
          setAnimBonusOut(true);
          const tOut = window.setTimeout(() => {
            setAnimBonusOut(false);
            setStage("bet");
            setBonusCard(null);
            setCanCollect(false);
            setAnimCardsIn(true);
            const tIn = window.setTimeout(() => setAnimCardsIn(false), CARDS_IN_MS);
            setBarFadeOut(false);
            setBarFadeIn(true);
            const tBarIn = window.setTimeout(() => setBarFadeIn(false), 450);
            flipTimers.current.push(tIn, tBarIn);
          }, BONUS_OUT_MS);
          flipTimers.current.push(tOut);
        }, BONUS_PAUSE_MS);
        flipTimers.current.push(tPauseLose);
      }
    }, 220);
    flipTimers.current.push(t2);
  };

  const onBetOne = () => { if (stage==="bet") setBet(b => (b % 5) + 1); };
  const onMaxBet = () => { if (stage==="bet") setBet(5); };
  const onDealOrDraw = () => {
    if (stage === "bet") return onDeal();
    if (stage === "draw") return onDraw();
  };

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;
      if (showOutOfCredits && e.code === "Space") {
        e.preventDefault();
        startNewGame();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (stage === "bet") onDeal();
        else if (stage === "draw") onDraw();
      }
      if (stage === "draw" && /^[1-5]$/.test(e.key)) {
        toggleHold(Number(e.key) - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, hand, held, bet, credits, showOutOfCredits]);

  const cardImage = (c?: Card) => c ? `/cards/${cardCode(c)}.svg` : "/cards/2B.svg";
  const canDeal = stage==="bet" && credits>=bet;
  const canDraw = stage==="draw";

  return (
    <div className="wrap">
      <header className="top">
        <img src="/img/JacksOrBetter.png" alt="Jacks or Better" className="logo" />
        <div className="bank">
          <div className="panel">
            <div className="label">Credits</div>
            <div className="value">{credits}</div>
          </div>
          <div className="panel">
            <div className="label">Bet</div>
            <div className="value">{bet}</div>
          </div>
        </div>
        <button className="btn" onClick={() => setShowPaytable(true)}>Show Paytable</button>
      </header>

      {/* Paytable moved into modal, accessible via CTA */}

  <div className="status" key={message}>{message}</div>
  <div className="playfield">
  <section className={`cards ${animCardsOut?"slide-out":animCardsIn?"slide-in":""} ${stage==="bonus" && animBonusInRight?"fade-in":""}`}>
      {Array.from({length:5}).map((_,i)=>{
        if (hideMainCards && stage !== "bonus") {
          // while animating out, replace main grid with spacers to avoid visual duplication
          return (
            <div className="card-col" key={`h-${i}`}>
              <div className="card-spacer" />
              <div className="held-slot"><div className="held-label" style={{opacity:0}}>&nbsp;</div></div>
            </div>
          );
        }
        if (stage === "bonus") {
          // In bonus, render the single card in the middle (3rd) slot; others are spacers
          return (
            <div className="card-col" key={`b-${i}`}>
              {i === 2 ? (
                <div className={`bonus-card ${animBonusIn?"slide-in":animBonusOut?"slide-out":""} ${animBonusInRight?"slide-in-right":""}`}>
                  <button className="card" disabled>
                    <div className="card3d">
                      <div className="card3d-inner">
                        {(() => { const imgSrc = bonusCard ? cardImage(bonusCard) : "/cards/2B.svg"; return (
                          <>
                            <img className="card-face card-back" src={imgSrc} alt={bonusCard ? cardCode(bonusCard) : "Back"} />
                            <img className="card-face card-front" src={imgSrc} alt={bonusCard ? cardCode(bonusCard) : "Back"} />
                          </>
                        ); })()}
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="card-spacer" />
              )}
              <div className="held-slot"><div className="held-label" style={{opacity:0}}>&nbsp;</div></div>
            </div>
          );
        }
        const c = hand[i];
        const heldFlag = held[i];
        return (
          <div className="card-col" key={i}>
            <button
              onClick={()=>toggleHold(i)}
              disabled={!canDraw}
              className={`card ${stage === "draw" && heldFlag?"held":""}`}
              aria-pressed={heldFlag}
            >
              <div className={`card3d ${flipped[i] ? 'is-flipped' : ''}`}>
                <div className="card3d-inner">
                  <img className="card-face card-back" src="/cards/2B.svg" alt="Back" />
                  <img className="card-face card-front" src={c? cardImage(c) : "/cards/2B.svg"} alt={c? cardCode(c) : "Back"} />
                </div>
              </div>
            </button>
            <div className="held-slot">
              <div className={`held-label ${heldFlag ? "visible" : ""}`}>HOLD</div>
            </div>
            <button
              className={`machine-btn hold-btn ${heldFlag?"active":""}`}
              onClick={()=>toggleHold(i)}
              disabled={stage!=="draw"}
            >
              <span className="line1">{heldFlag? "CANCEL" : "HOLD"}</span>
              <span className="line2">{heldFlag? "HOLD" : "CANCEL"}</span>
            </button>
          </div>
        );
      })}
    </section>
    {outHand && animCardsOutSeqLeft && (
      <section className="cards out-overlay fade-out" style={{ animationDuration: `${outFadeMs}ms` }} aria-hidden>
        {outHand.map((c,i)=> (
          <div className="card-col" key={`out-${i}`}>
            <button className={`card slide-left`} style={{ animationDelay: `${i * BONUS_STAGGER_MS}ms` }} disabled>
              <div className="card3d is-flipped">
                <div className="card3d-inner">
                  <img className="card-face card-back" src="/cards/2B.svg" alt="Back" />
                  <img className="card-face card-front" src={cardImage(c)} alt={cardCode(c)} />
                </div>
              </div>
            </button>
            <div className="held-slot"><div className={`held-label ${held[i]?"visible":""}`}>HOLD</div></div>
          </div>
        ))}
      </section>
    )}
  </div>
  {showBonusOffer && stage==="bonus-offer" && pendingWin>0 && (
        <div className="modal-overlay playfield-overlay" role="dialog" aria-modal="true" aria-label="Double or Nothing">
          <div className="modal modal-offer">
            <p>Double or Nothing</p>
            <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
              <button className="machine-btn" onClick={collectPending}>NO</button>
              <button className="machine-btn" onClick={startBonus}>YES</button>
            </div>
          </div>
        </div>
  )}

  {/* Hold/Cancel per-card buttons moved directly under each card above */}

  {/* Bottom machine-style button bar */}
  <section className={`machine-bar ${barFadeOut?"fade-out":""} ${barFadeIn?"fade-in":""}`}>
        {stage!=="bonus" ? (
          <>
            <button className="machine-btn bar-btn" onClick={onBetOne} disabled={stage!=="bet"}>BET ONE</button>
            <button className="machine-btn bar-btn" onClick={onMaxBet} disabled={stage!=="bet"}>MAX BET</button>
            <div className="spacer" />
            <button
              className="machine-btn primary dealdraw-btn"
              onClick={onDealOrDraw}
              disabled={stage==="bet" ? !canDeal : false}
            >
              {stage === "draw" ? "DRAW" : "DEAL"}
            </button>
          </>
        ) : (
          <>
            <button className="machine-btn bar-btn dealdraw-btn bonus-red" onClick={()=>onBonusGuess("red")}>RED</button>
            <button className="machine-btn bar-btn dealdraw-btn bonus-black" onClick={()=>onBonusGuess("black")}>BLACK</button>
            <div className="spacer" />
            <button className="machine-btn primary dealdraw-btn" onClick={collectPending} disabled={!canCollect}>COLLECT</button>
          </>
        )}
      </section>

  
      {showPaytable && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Paytable">
          <div className="modal modal-paytable">
            <h2>Paytable</h2>
            <div className="paytable-board" role="table" aria-label="Video Poker Paytable">
              <div className="pt-grid" role="rowgroup">
                {(["Royal Flush","Straight Flush","Four of a Kind","Full House","Flush","Straight","Three of a Kind","Two Pair","Jacks or Better"] as HandRank[]).map(name => (
                  <div className={`pt-row ${result?.name===name?"pt-row-active":""}`} key={`row-${name}`} role="row">
                    <div className="pt-hand" role="rowheader">{name}</div>
                    {PAYTABLE[name].map((v,i)=>(
                      <div key={`c-${name}-${i}`} className={`pt-cell ${bet===i+1?"pt-col-active":""}`} role="cell">{v}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
              <button className="btn" onClick={() => setShowPaytable(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
  
  {/* bonus continue modal removed in favor of inline collect flow */}
  {showWin && winDetails ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Winnings">
          <div className="modal">
            <h2>Winner!</h2>
            <p>{winDetails.name} — You won {winDetails.payout} credit{winDetails.payout===1?"":"s"}.</p>
            <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
              <button className="btn" onClick={() => setShowWin(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
      {showOutOfCredits && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Out of credits">
          <div className="modal">
            <h2>Out of credits</h2>
            <p>You have no credits left. Start a new game to continue.</p>
            <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
              <button className="btn success" onClick={startNewGame}>NEW GAME (+200)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
