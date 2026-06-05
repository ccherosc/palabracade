# PalabraCade v0.1

Learn Spanish through arcade mini-games.

PalabraCade is a Vite + React project built around short, replayable practice loops for vocabulary, sentence order, memory, reflexes, and conjugation drills.

## Current arcade lineup

- Sentence Snake
- Word Whack
- Conexiones
- Memory Mercado
- Ahorcado
- Verb Runner
- Palabra Invaders
- Flappy Vocab
- Conjugation Castle
- Radar Relay
- Phrase Forge

## What changed in this polish pass

- Premium-feeling main menu with clearer branding, progress stats, and product framing
- Stronger game cards with progress snapshots and cleaner calls to action
- Shared `ArcadeGameShell` layout used for polished game presentation
- Conjugation Castle promoted from concept to playable game
- Radar Relay added as a new fast-recall mini-game
- Phrase Forge added as a new sentence-building mini-game
- Truthful validation script wired to `npm test`

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

## Preview production build locally

```bash
npm run build
npm run preview
```
