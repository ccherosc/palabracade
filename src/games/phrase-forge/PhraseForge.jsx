import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ArcadeGameShell from '../../components/ArcadeGameShell.jsx';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './PhraseForge.css';

const ROUND_TIME = 18;
const ROUND_TARGET = 8;

const PHRASES = [
  { english: 'I want a red apple.', spanish: 'Yo quiero una manzana roja.' },
  { english: 'We are going to the park today.', spanish: 'Nosotros vamos al parque hoy.' },
  { english: 'She studies Spanish every night.', spanish: 'Ella estudia español cada noche.' },
  { english: 'My friends need more time.', spanish: 'Mis amigos necesitan más tiempo.' },
  { english: 'Can you open the window, please?', spanish: '¿Puedes abrir la ventana, por favor?' },
  { english: 'The teacher explains the lesson well.', spanish: 'La profesora explica bien la lección.' },
  { english: 'I am looking for the train station.', spanish: 'Estoy buscando la estación de tren.' },
  { english: 'They eat dinner after the game.', spanish: 'Ellos cenan después del juego.' },
  { english: 'We have class at nine.', spanish: 'Tenemos clase a las nueve.' },
  { english: 'Your backpack is under the table.', spanish: 'Tu mochila está debajo de la mesa.' },
  { english: 'The cat sleeps on the warm bed.', spanish: 'El gato duerme en la cama caliente.' },
  { english: 'Tomorrow I am going to call my grandmother.', spanish: 'Mañana voy a llamar a mi abuela.' },
];

function normalizeToken(token) {
  return token.replace(/[¿?.,!]/g, '');
}

function buildRound(phrase) {
  const tokens = phrase.spanish.split(' ');
  return {
    ...phrase,
    answer: tokens,
    bank: shuffle(tokens.map((token, index) => ({ id: `${normalizeToken(token)}-${index}`, token, normalized: normalizeToken(token) }))),
  };
}

function buildDeck() {
  return shuffle(PHRASES).slice(0, ROUND_TARGET).map(buildRound);
}

export default function PhraseForge() {
  const best = ProgressSystem.getGame('phrase-forge').highScore;
  const deckRef = useRef(buildDeck());
  const correctRef = useRef(0);
  const missRef = useRef(0);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);

  const [phase, setPhase] = useState('idle');
  const [roundIndex, setRoundIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestScore, setBestScore] = useState(best);
  const [message, setMessage] = useState('Build the full Spanish sentence in order.');
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentRound, setCurrentRound] = useState(deckRef.current[0]);

  const accuracy = useMemo(() => {
    const total = correctRef.current + missRef.current;
    return total ? Math.round((correctRef.current / total) * 100) : 0;
  }, [score, roundIndex, phase]);

  const stats = useMemo(() => [
    { label: 'Round', value: `${Math.min(roundIndex + 1, ROUND_TARGET)}/${ROUND_TARGET}` },
    { label: 'Score', value: score },
    { label: 'Combo', value: streak > 1 ? `x${streak}` : '—' },
    { label: 'Clock', value: `${timeLeft.toFixed(1)}s` },
  ], [roundIndex, score, streak, timeLeft]);

  const finishRun = useCallback((nextPhase, nextMessage) => {
    ProgressSystem.saveGame('phrase-forge', {
      score: scoreRef.current,
      streak: streakRef.current,
      accuracy: (() => {
        const total = correctRef.current + missRef.current;
        return total ? Math.round((correctRef.current / total) * 100) : 0;
      })(),
    });
    setBestScore(current => Math.max(current, scoreRef.current));
    setPhase(nextPhase);
    setMessage(nextMessage);
    if (nextPhase === 'won') {
      AudioManager.levelUp();
    } else {
      AudioManager.gameOver();
    }
  }, []);

  const loadRound = useCallback((nextIndex) => {
    const nextRound = deckRef.current[nextIndex];
    if (!nextRound) {
      finishRun('won', 'Forge complete — every phrase landed cleanly.');
      return;
    }

    setRoundIndex(nextIndex);
    setCurrentRound(nextRound);
    setSelectedIds([]);
    setTimeLeft(ROUND_TIME);
  }, [finishRun]);

  const commitRound = useCallback((success) => {
    const nextIndex = roundIndex + 1;
    if (success) {
      loadRound(nextIndex);
      return;
    }

    if (nextIndex >= ROUND_TARGET) {
      finishRun('lost', `Time cracked the forge. Final answer: ${currentRound.spanish}`);
      return;
    }

    setMessage(`Cool the forge and try the next phrase. Correct answer: ${currentRound.spanish}`);
    loadRound(nextIndex);
  }, [currentRound, finishRun, loadRound, roundIndex]);

  const startGame = useCallback(() => {
    deckRef.current = buildDeck();
    correctRef.current = 0;
    missRef.current = 0;
    scoreRef.current = 0;
    streakRef.current = 0;
    setPhase('playing');
    setRoundIndex(0);
    setTimeLeft(ROUND_TIME);
    setScore(0);
    setStreak(0);
    setSelectedIds([]);
    setCurrentRound(deckRef.current[0]);
    setMessage('Tap the Spanish tiles in order — precision first, speed second.');
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const timer = window.setInterval(() => {
      setTimeLeft(value => {
        if (value <= 0.1) {
          missRef.current += 1;
          streakRef.current = 0;
          setStreak(0);
          commitRound(false);
          return ROUND_TIME;
        }
        return Math.max(0, value - 0.1);
      });
    }, 100);

    return () => window.clearInterval(timer);
  }, [commitRound, phase]);

  const selectedTokens = useMemo(() => {
    const byId = new Map(currentRound.bank.map(tile => [tile.id, tile.token]));
    return selectedIds.map(id => byId.get(id)).filter(Boolean);
  }, [currentRound, selectedIds]);

  const progressPercent = (selectedIds.length / currentRound.answer.length) * 100;

  function handleTilePick(tileId) {
    if (phase !== 'playing' || selectedIds.includes(tileId)) return;

    const nextIndex = selectedIds.length;
    const selectedTile = currentRound.bank.find(tile => tile.id === tileId);
    const expectedToken = currentRound.answer[nextIndex];

    if (selectedTile?.token === expectedToken) {
      const nextSelected = [...selectedIds, tileId];
      setSelectedIds(nextSelected);
      AudioManager.correct();

      if (nextSelected.length === currentRound.answer.length) {
        correctRef.current += 1;
        streakRef.current += 1;
        const points = 160 + Math.round(timeLeft * 22) + Math.max(0, streakRef.current - 1) * 28;
        scoreRef.current += points;
        setScore(scoreRef.current);
        setStreak(streakRef.current);
        setMessage(`Sentence forged — ${currentRound.spanish}`);
        window.setTimeout(() => commitRound(true), 250);
      }
    } else {
      missRef.current += 1;
      streakRef.current = 0;
      setStreak(0);
      setMessage(`Out of order — next tile should be “${expectedToken}”.`);
      AudioManager.wrong();
      window.setTimeout(() => commitRound(false), 350);
    }
  }

  function clearAttempt() {
    if (phase !== 'playing' || selectedIds.length === 0) return;
    setSelectedIds([]);
    setMessage('Forge reset — rebuild the sentence from the beginning.');
  }

  return (
    <ArcadeGameShell
      title="Phrase Forge"
      subtitle="Build complete Spanish sentences one tap at a time. Great for mobile thumbs, clean enough for quick desktop repetition, and tuned for practical phrase order." 
      eyebrow="Sentence builder"
      accent="#f97316"
      stats={stats}
      aside={
        <div className="forge-side">
          <h2>Forge rules</h2>
          <ul>
            <li>Follow the English cue and tap the Spanish words in exact order.</li>
            <li>Every clean sentence boosts combo and score.</li>
            <li>A wrong tile or time-out sends you to the next phrase with the answer revealed.</li>
          </ul>
          <div className="forge-side__pill">Accuracy: {accuracy}%</div>
          <div className="forge-side__pill">Best score: {bestScore.toLocaleString()}</div>
        </div>
      }
      footer={<p>Designed for thumb-friendly tile tapping on mobile while still feeling deliberate and satisfying on desktop.</p>}
    >
      <div className="forge-board">
        {phase !== 'playing' && (
          <div className="forge-overlay">
            <div className="forge-overlay__card">
              <div className="forge-overlay__emoji">⚒️</div>
              <h2>{phase === 'won' ? 'Forge complete' : phase === 'lost' ? 'Heat lost' : 'Ready to forge'}</h2>
              <p>
                {phase === 'won'
                  ? `You forged ${ROUND_TARGET} phrases with ${score.toLocaleString()} points.`
                  : phase === 'lost'
                    ? `You finished with ${score.toLocaleString()} points. Want a cleaner run?`
                    : 'Tap Spanish word tiles into the right order to complete each phrase.'}
              </p>
              {(phase === 'won' || phase === 'lost') && score >= bestScore && score > 0 && (
                <strong className="forge-overlay__badge">🏆 New phrase record</strong>
              )}
              <button className="arcade-btn arcade-btn--full" onClick={startGame}>
                {phase === 'idle' ? '▶ Start forging' : '▶ Forge another run'}
              </button>
            </div>
          </div>
        )}

        <div className="forge-prompt">
          <span className="forge-prompt__eyebrow">English cue</span>
          <h2>{currentRound.english}</h2>
          <p>Build the matching Spanish phrase in the correct order.</p>
        </div>

        <div className="forge-progress">
          <div className="forge-progress__rail">
            <div className="forge-progress__fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span>{selectedIds.length}/{currentRound.answer.length} tiles locked</span>
        </div>

        <div className="forge-assembly" aria-live="polite">
          {selectedTokens.length === 0 ? (
            <span className="forge-assembly__placeholder">Selected tiles will land here…</span>
          ) : (
            selectedTokens.map(token => <span key={`${token}-${selectedTokens.indexOf(token)}`} className="forge-chip forge-chip--active">{token}</span>)
          )}
        </div>

        <div className="forge-message">{message}</div>

        <div className="forge-bank">
          {currentRound.bank.map(tile => {
            const chosen = selectedIds.includes(tile.id);
            return (
              <button
                key={tile.id}
                className={`forge-chip ${chosen ? 'forge-chip--spent' : ''}`}
                onClick={() => handleTilePick(tile.id)}
                disabled={phase !== 'playing' || chosen}
              >
                {tile.token}
              </button>
            );
          })}
        </div>

        <div className="forge-actions">
          <button className="arcade-btn arcade-btn--ghost" onClick={clearAttempt} disabled={phase !== 'playing' || selectedIds.length === 0}>
            Reset attempt
          </button>
          <div className="forge-clock">{timeLeft.toFixed(1)}s left</div>
        </div>
      </div>
    </ArcadeGameShell>
  );
}
