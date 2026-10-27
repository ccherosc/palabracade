# Sentence Snake — Difficulty Bands, Speed Control & Visual Learning Cues

**Date:** 2026-06-03
**Scope:** `src/games/snake-sentences/` + `src/data/sentences.json`

---

## Overview

Sentence Snake gets three interconnected upgrades:

1. **Lobby screen** — a dedicated pre-game screen (between main menu and game) where the player picks difficulty and speed independently before every session.
2. **Difficulty bands** — four named bands that control hints and highlights. Speed is fully independent.
3. **Translation strip** — a fixed area below the game board that shows the English equivalent of each eaten word via a mascot talk bubble.

All changes are PC-first and mobile-ready (responsive layout verified at 375px width).

---

## 1. Lobby Screen

Replaces the idle overlay that currently lives inside the game board. Accessed via the game card on the main menu — the route `/games/snake-sentences` renders the lobby first; the game board only appears after "Start Game" is pressed.

### Layout (top to bottom)

```
┌─────────────────────────────────────┐
│  🐍  Sentence Snake                 │  ← header, ← Menu button
│      Serpiente de Sentencias        │
├─────────────────────────────────────┤
│  DIFFICULTY                         │
│  ○ 🌟 Easy        [desc]            │
│  ○ ⚡ Challenger 1 [desc]            │
│  ○ 🔥 Challenger 2 [desc]            │
│  ○ 💀 Challenger 3 [desc]            │
├─────────────────────────────────────┤
│  SPEED                              │
│  [ ▲ ]  [ 1 ]  [ ▼ ]   Glacial     │
│  "Plenty of time to think…"         │
├─────────────────────────────────────┤
│  [ ▶ Start Game ]                   │
│  Your best: — pts · 0 plays         │
└─────────────────────────────────────┘
```

### Behaviour

- Last-used difficulty and speed are saved to `localStorage` via `SaveSystem` and restored on next visit.
- The ← Menu button returns to `/` without starting a game.
- "Start Game" transitions directly into the game — no further overlay on the board.

---

## 2. Difficulty Bands

Four bands. **Difficulty controls hints and highlights only** — speed is set separately.

| Band | Icon | Board highlight | Panel hint | Building row | Sentence pool | Decoys |
|---|---|---|---|---|---|---|
| Easy | 🌟 | Target word glows green | Spanish word shown | All words visible | easy | 0 |
| Challenger 1 | ⚡ | None | English word shown | All words visible | easy + medium | 0 |
| Challenger 2 | 🔥 | None | None | Uneaten words as `???` | medium + hard | 0 |
| Challenger 3 | 💀 | None | None | Uneaten words as `???` | hard + challenge | 2–4 random decoys |

### Panel hint detail

- **Easy** — "EAT NEXT" label + the Spanish word in a green pill
- **Challenger 1** — "HINT" label + the English translation in a gold dashed pill  
- **Challenger 2 / 3** — label area reads *"You know this — build it!"* in dim text; no word shown

### Sentence building row (side panel)

Shows the full Spanish sentence as chips. As words are eaten:
- Eaten words → green, filled in
- Currently targeted word → amber, pulsing (Easy and C1 only; C2/C3 show `???` until eaten)
- Future words → dim (Easy/C1 show the actual word; C2/C3 show `???`)

### Decoys (Challenger 3)

2–4 extra Spanish words are placed on the board drawn from `sentences.json` words that are **not** part of the current sentence. Eating a decoy costs one heart. Decoys are visually indistinguishable from real sentence words (this is the point).

---

## 3. Speed Control

### Counter widget (lobby)

- Integer stepper, range **1–99**
- ▲ / ▼ buttons; hold either button to ramp continuously (400 ms delay, then 60 ms repeat)
- Display pulses briefly on change

### Speed → tick mapping

Speed 1 = 220 ms/tick (slowest). Speed 99 = 60 ms/tick (fastest).
Formula: `tickMs = Math.round(220 - (speed - 1) * (160 / 98))`

### Speed personality names

Shown as a bold name + italic flavour line below the counter. Updates live.

| Range | Name | Flavour |
|---|---|---|
| 1–9   | Glacial | "Plenty of time to think about your life choices." |
| 10–19 | Sunday Stroll | "The snake is wearing sandals." |
| 20–29 | Warming Up | "Light stretching. Very responsible." |
| 30–39 | Jogging Pace | "You could do this. You're an athlete now." |
| 40–49 | Getting Spicy 🌶 | "The snake smells blood." |
| 50–59 | Half Loco | "Your palms are getting sweaty." |
| 60–69 | Zoom Zoom 🏎 | "The words are beginning to blur together." |
| 70–79 | Hold Onto Your Hat | "This is fine. Everything is fine." |
| 80–89 | Absolutely Unhinged | "Your Spanish teacher is watching in horror." |
| 90–98 | What Is Wrong With You | "The snake has become the words." |
| 99    | LUDICROUS SPEED 🚀 | "You have gone plaid. Chapó. We can't help you now." |

---

## 4. Translation Strip

A **fixed zone below the game board** — never overlaps gameplay. Height: ~72px on desktop, ~64px on mobile.

### Layout

```
[ 🐍 mascot ]  [ talk bubble: "como" = eat ]
  placeholder    slides in on word eat, fades after ~2s
```

### Mascot placeholder

Circular dashed container (52px diameter) with 🐍 emoji centred. Labelled "mascot" in tiny text beneath. Designed to be swapped for animated snake character art in a future pass.

### Talk bubble

- Rounded rectangle with a left-pointing tail pointing to the mascot
- **Idle state:** dim text — *"Eat the next word to see its meaning…"*
- **Word-eaten state:** `[Spanish word]  =  [English word]` — Spanish in green, English in gold. Slides in with a smooth 200 ms ease-out. Auto-dims after 2 seconds (does not disappear — stays visible until next word).
- **Streak state (3+ streak):** adds a 🔥 streak callout to the right of the translation

### `sentences.json` addition

Each sentence gets an `englishWords` array aligned 1:1 with the `spanish` array. Used to look up the English equivalent of the eaten word. Example:

```json
{
  "english": "She has a dog.",
  "spanish": ["Ella", "tiene", "un", "perro."],
  "englishWords": ["She", "has", "a", "dog"]
}
```

---

## 5. PC & Mobile Layout

### Desktop (≥ 769px)

```
HUD bar
├── Side panel (220px) │ Game board (flex 1)
                       └── Translation strip (full width of board column)
```

### Mobile (≤ 768px)

```
HUD bar (compact)
Side panel → horizontal strip (key info only: sentence + building row)
Game board (full width, scaled)
Translation strip (full width)
D-pad (full width, larger touch targets: 60px buttons)
```

The d-pad buttons increase from 52px → 60px on mobile. Side panel collapses: hides difficulty/speed labels, shows only "Translate" sentence and the building row.

---

## 6. Data Changes

- `sentences.json` — add `englishWords` array to all 20 sentences.
- No new data files required.

## 7. State Changes

`makeInitialState()` gains:
- `difficulty: string` — band id, default `'easy'`
- `speed: number` — 1–99, default `5`

Both are read from `SaveSystem` on lobby mount and written back on Start.

## 8. Files Changed

| File | Change |
|---|---|
| `src/data/sentences.json` | Add `englishWords` to all 20 entries |
| `src/games/snake-sentences/SnakeSentences.jsx` | Lobby screen, difficulty config, speed formula, translation strip, panel variants, decoys |
| `src/games/snake-sentences/SnakeSentences.css` | Translation strip styles, lobby styles, mobile layout improvements |

No other files need to change.
