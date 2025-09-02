import { useMemo, useState, useEffect, useRef } from "react";

type Suit = "S" | "H" | "D" | "C";
type Rank = 2|3|4|5|6|7|8|9|10|"J"|"Q"|"K"|"A";
type Stage = "bet" | "draw" | "payout";
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

  const FLIP_MS = 350; // single flip duration
  const DEAL_STAGGER_MS = 120; // delay between cards on deal
  const DRAW_STAGGER_MS = 120; // delay between cards on draw

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

  const startNewGame = () => {
    clearTimers();
    setShowOutOfCredits(false);
    setCredits(200);
    setBet(5);
    setDeck(shuffle(buildDeck()));
    setHand([]);
    setHeld([false,false,false,false,false]);
    setFlipped([false,false,false,false,false]);
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
      // Return to bet stage so player can change bet; keep banner visible until next deal
      setStage("bet");
      const ev = evaluateHand(finalHand);
      const payout = PAYTABLE[ev.name][bet-1];
      if (payout > 0) {
        setCredits(c => c + payout);
        setWinDetails({ name: ev.name, payout });
        setMessage(`You win ${payout} credit${payout===1?"":"s"} with a ${ev.name}.`);
        setShowWin(false);
      } else {
        setWinDetails(null);
        setMessage("No win. Try again.");
      }
    }, totalDelay);
    flipTimers.current.push(t3);
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
        <h1>Jacks or Better</h1>
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
  <section className="cards">
        {Array.from({length:5}).map((_,i)=>{
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
                <div className={`held-label ${heldFlag ? "visible" : ""}`}>HELD</div>
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

  {/* Hold/Cancel per-card buttons moved directly under each card above */}

  {/* Bottom machine-style button bar */}
      <section className="machine-bar">
  <button className="machine-btn" onClick={onBetOne} disabled={stage!=="bet"}>BET ONE</button>
  <button className="machine-btn" onClick={onMaxBet} disabled={stage!=="bet"}>MAX BET</button>
  <div className="spacer" />
        <button
          className="machine-btn primary dealdraw-btn"
          onClick={onDealOrDraw}
          disabled={stage==="bet" ? !canDeal : false}
        >
          {stage === "draw" ? "DRAW" : "DEAL"}
        </button>
      </section>

  
      {showPaytable && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Paytable">
          <div className="modal">
            <h2>Paytable</h2>
            <section className="paytable">
              {( ["Royal Flush","Straight Flush","Four of a Kind","Full House","Flush","Straight","Three of a Kind","Two Pair","Jacks or Better"] as HandRank[])
                .map(name => (
                <div key={name} className={`pt-item ${result?.name===name ? "pt-active" : ""}`}>
                  <div className="pt-name">{name}</div>
                  <div className="pt-row">
                    {PAYTABLE[name].map((v,i)=>(
                      <span key={i} className={`pt-chip ${bet===i+1 ? "pt-chip-active":""}`}>{i+1}:{v}</span>
                    ))}
                  </div>
                </div>
              ))}
            </section>
            <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
              <button className="btn" onClick={() => setShowPaytable(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
  {showWin && winDetails && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Winnings">
          <div className="modal">
            <h2>Winner!</h2>
            <p>{winDetails.name} — You won {winDetails.payout} credit{winDetails.payout===1?"":"s"}.</p>
            <div className="row" style={{ justifyContent: "center", marginTop: 8 }}>
              <button className="btn" onClick={() => setShowWin(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
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
