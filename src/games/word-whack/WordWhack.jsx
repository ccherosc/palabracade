import React, { useState, useEffect, useRef, useCallback } from 'react';
import HUD from '../../components/HUD.jsx';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './WordWhack.css';

// Combined vocab pool (inline for WIP — will pull from WordBank when promoted)
const VOCAB = [
  { en: 'dog', es: 'perro' }, { en: 'cat', es: 'gato' }, { en: 'apple', es: 'manzana' },
  { en: 'bread', es: 'pan' }, { en: 'house', es: 'casa' }, { en: 'water', es: 'agua' },
  { en: 'book', es: 'libro' }, { en: 'bird', es: 'pájaro' }, { en: 'fish', es: 'pez' },
  { en: 'sun', es: 'sol' }, { en: 'moon', es: 'luna' }, { en: 'tree', es: 'árbol' },
  { en: 'flower', es: 'flor' }, { en: 'milk', es: 'leche' }, { en: 'egg', es: 'huevo' },
  { en: 'school', es: 'escuela' }, { en: 'friend', es: 'amigo' }, { en: 'chair', es: 'silla' },
  { en: 'table', es: 'mesa' }, { en: 'pencil', es: 'lápiz' }, { en: 'horse', es: 'caballo' },
  { en: 'ball', es: 'pelota' }, { en: 'door', es: 'puerta' }, { en: 'window', es: 'ventana' },
];

const HOLES = 9;
const GAME_TIME = 60;
const MOLE_SHOW_MS = 2200;
const MOLE_INTERVAL = 900;

function rnd(n) { return Math.floor(Math.random() * n); }

function buildMoles(target, vocab) {
  // Pick target + 2 distractors
  const distractors = shuffle(vocab.filter(w => w.es !== target.es)).slice(0, HOLES - 1);
  const pool = shuffle([target, ...distractors]);
  // Only fill HOLES slots, some may be empty (null)
  return Array.from({ length: HOLES }, (_, i) => pool[i] ?? null);
}

export default function WordWhack() {
  const [phase, setPhase]         = useState('idle'); // idle | playing | dead
  const [score, setScore]         = useState(0);
  const [streak, setStreak]       = useState(0);
  const [hearts, setHearts]       = useState(3);
  const [timeLeft, setTimeLeft]   = useState(GAME_TIME);
  const [prompt, setPrompt]       = useState(null);   // { en, es }
  const [moles, setMoles]         = useState(Array(HOLES).fill(null));
  const [hits, setHits]           = useState(0);
  const [misses, setMisses]       = useState(0);
  const [flashHole, setFlashHole] = useState(null);   // { index, type }
  const [highScore, setHighScore] = useState(() => ProgressSystem.getGame('word-whack').highScore);

  const phaseRef      = useRef(phase);
  const moleTimerRef  = useRef(null);
  const clockRef      = useRef(null);
  const heartsRef     = useRef(3);
  const scoreRef      = useRef(0);
  const streakRef     = useRef(0);
  const hitsRef       = useRef(0);
  const missesRef     = useRef(0);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const stopGame = useCallback((finalScore, finalHits, finalMisses) => {
    clearInterval(moleTimerRef.current);
    clearInterval(clockRef.current);
    const accuracy = finalHits + finalMisses > 0
      ? Math.round(finalHits / (finalHits + finalMisses) * 100) : 0;
    ProgressSystem.saveGame('word-whack', { score: finalScore, streak: streakRef.current, accuracy });
    setHighScore(s => Math.max(s, finalScore));
    setPhase('dead');
    AudioManager.gameOver();
  }, []);

  function spawnMoles() {
    const target = VOCAB[rnd(VOCAB.length)];
    setPrompt(target);
    setMoles(buildMoles(target, VOCAB));
  }

  function startGame() {
    heartsRef.current = 3;
    scoreRef.current = 0;
    streakRef.current = 0;
    hitsRef.current = 0;
    missesRef.current = 0;
    setHearts(3); setScore(0); setStreak(0); setTimeLeft(GAME_TIME);
    setHits(0); setMisses(0); setFlashHole(null);

    spawnMoles();
    setPhase('playing');

    moleTimerRef.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      spawnMoles();
    }, MOLE_INTERVAL + MOLE_SHOW_MS);

    clockRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          stopGame(scoreRef.current, hitsRef.current, missesRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function handleWhack(index, word) {
    if (phaseRef.current !== 'playing' || word === null) return;
    if (!prompt) return;

    const correct = word.es === prompt.es;

    setFlashHole({ index, type: correct ? 'good' : 'bad' });
    setTimeout(() => setFlashHole(null), 400);

    if (correct) {
      AudioManager.correct();
      streakRef.current++;
      hitsRef.current++;
      const pts = 10 + (streakRef.current > 2 ? streakRef.current * 2 : 0);
      scoreRef.current += pts;
      setScore(scoreRef.current);
      setStreak(streakRef.current);
      setHits(hitsRef.current);
      spawnMoles();
    } else {
      AudioManager.wrong();
      streakRef.current = 0;
      missesRef.current++;
      heartsRef.current--;
      setStreak(0);
      setMisses(missesRef.current);
      setHearts(heartsRef.current);
      if (heartsRef.current <= 0) {
        stopGame(scoreRef.current, hitsRef.current, missesRef.current);
      }
    }
  }

  useEffect(() => () => {
    clearInterval(moleTimerRef.current);
    clearInterval(clockRef.current);
  }, []);

  const accuracy = hits + misses > 0 ? Math.round(hits / (hits + misses) * 100) : 0;

  return (
    <div className="whack-game">
      <HUD title="Word Whack" score={score} streak={streak} hearts={hearts} maxHearts={3} />

      <div className="whack-layout">
        {/* Prompt */}
        <div className="whack-prompt-wrap">
          {phase === 'playing' && prompt && (
            <>
              <span className="whack-prompt__label">Whack the Spanish word for:</span>
              <div className="whack-prompt__word">{prompt.en}</div>
              <div className="whack-timer">
                <div
                  className="whack-timer__bar"
                  style={{ width: `${(timeLeft / GAME_TIME) * 100}%`, '--pct': timeLeft / GAME_TIME }}
                />
                <span className="whack-timer__text">{timeLeft}s</span>
              </div>
            </>
          )}
        </div>

        {/* Grid */}
        <div className="whack-grid">
          {moles.map((word, i) => {
            const flash = flashHole?.index === i;
            const flashType = flashHole?.type;
            return (
              <button
                key={i}
                className={`whack-hole ${word ? 'whack-hole--active' : ''} ${flash ? `whack-hole--flash-${flashType}` : ''}`}
                onClick={() => handleWhack(i, word)}
                disabled={phase !== 'playing'}
              >
                <div className="whack-hole__mound" />
                {word && (
                  <div className={`whack-mole ${flash ? `whack-mole--${flashType}` : ''}`}>
                    <span className="whack-mole__face">🐹</span>
                    <span className="whack-mole__word">{word.es}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Stats strip */}
        {phase === 'playing' && (
          <div className="whack-stats">
            <span>✓ {hits} correct</span>
            <span>✗ {misses} wrong</span>
            <span>Accuracy: {accuracy}%</span>
          </div>
        )}
      </div>

      {/* Idle overlay */}
      {phase === 'idle' && (
        <div className="whack-overlay">
          <div className="whack-overlay__box">
            <div className="whack-overlay__emoji">🔨</div>
            <h2 className="whack-overlay__title">Word Whack</h2>
            <p className="whack-overlay__sub">Golpe de Palabras</p>
            <div className="whack-overlay__instructions">
              <p>An English word appears at the top.</p>
              <p>Whack the mole with the correct <strong>Spanish</strong> translation before time runs out!</p>
              <p>3 wrong = game over &nbsp;|&nbsp; 60 seconds per round</p>
            </div>
            <button className="arcade-btn arcade-btn--green arcade-btn--full" onClick={startGame}>▶ Start</button>
            {highScore > 0 && <p className="whack-overlay__best">⭐ Best: {highScore} pts</p>}
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {phase === 'dead' && (
        <div className="whack-overlay">
          <div className="whack-overlay__box">
            <div className="whack-overlay__emoji">🏁</div>
            <h2 className="whack-overlay__title">Time's Up!</h2>
            <div className="whack-overlay__results">
              <div className="whack-overlay__row"><span>Score</span><strong>{score}</strong></div>
              <div className="whack-overlay__row"><span>Correct</span><strong>{hits}</strong></div>
              <div className="whack-overlay__row"><span>Accuracy</span><strong>{accuracy}%</strong></div>
              {score >= highScore && score > 0 && <p className="whack-overlay__best-new">🏆 New High Score!</p>}
            </div>
            <button className="arcade-btn arcade-btn--green arcade-btn--full" onClick={startGame}>▶ Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}
