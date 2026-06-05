import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './MemoryMercado.css';

const VOCAB = [
  { es: 'perro',    en: 'dog',      emoji: '🐶' },
  { es: 'gato',     en: 'cat',      emoji: '🐱' },
  { es: 'pájaro',   en: 'bird',     emoji: '🐦' },
  { es: 'pez',      en: 'fish',     emoji: '🐟' },
  { es: 'caballo',  en: 'horse',    emoji: '🐴' },
  { es: 'conejo',   en: 'rabbit',   emoji: '🐰' },
  { es: 'manzana',  en: 'apple',    emoji: '🍎' },
  { es: 'pan',      en: 'bread',    emoji: '🍞' },
  { es: 'leche',    en: 'milk',     emoji: '🥛' },
  { es: 'huevo',    en: 'egg',      emoji: '🥚' },
  { es: 'rojo',     en: 'red',      emoji: '🔴' },
  { es: 'azul',     en: 'blue',     emoji: '🔵' },
  { es: 'verde',    en: 'green',    emoji: '🟢' },
  { es: 'amarillo', en: 'yellow',   emoji: '🟡' },
  { es: 'libro',    en: 'book',     emoji: '📚' },
  { es: 'lápiz',    en: 'pencil',   emoji: '✏️' },
  { es: 'casa',     en: 'house',    emoji: '🏠' },
  { es: 'sol',      en: 'sun',      emoji: '☀️' },
  { es: 'luna',     en: 'moon',     emoji: '🌙' },
  { es: 'agua',     en: 'water',    emoji: '💧' },
];

const DIFFICULTIES = [
  { id: 'easy',   label: 'Fácil',    pairs: 6,  cols: 4, icon: '🌟', ageRange: 'Ages 5–7',  desc: '6 pairs · No timer' },
  { id: 'medium', label: 'Medio',    pairs: 8,  cols: 4, icon: '⚡', ageRange: 'Ages 7–10', desc: '8 pairs · 90 second timer' },
  { id: 'hard',   label: 'Difícil',  pairs: 10, cols: 5, icon: '🔥', ageRange: 'Ages 10+',  desc: '10 pairs · 60 second timer' },
];

const TIMER_LIMITS = { easy: null, medium: 90, hard: 60 };

function buildCards(pairs) {
  const words = shuffle(VOCAB).slice(0, pairs);
  const cards = [];
  words.forEach((w, i) => {
    cards.push({ id: i * 2,     pairId: i, face: w.es,    sub: w.en, emoji: w.emoji, type: 'es' });
    cards.push({ id: i * 2 + 1, pairId: i, face: w.en,    sub: w.es, emoji: w.emoji, type: 'en' });
  });
  return shuffle(cards);
}

function useTimer(active, limit) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!active) { clearInterval(ref.current); return; }
    ref.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(ref.current);
  }, [active]);

  useEffect(() => { if (!active) setElapsed(0); }, [active]);

  const timeLeft = limit ? Math.max(0, limit - elapsed) : null;
  return { elapsed, timeLeft };
}

// ─── Lobby ────────────────────────────────────────────────────────────────────
function Lobby({ onStart }) {
  const navigate  = useNavigate();
  const progress  = ProgressSystem.getGame('memory-mercado');

  return (
    <div className="mem-lobby">
      <div className="mem-lobby__card">
        <div className="mem-lobby__header">
          <span className="mem-lobby__icon">🃏</span>
          <div>
            <div className="mem-lobby__title">Memory Mercado</div>
            <div className="mem-lobby__sub">Mercado de Memoria</div>
          </div>
          <button className="mem-lobby__back" onClick={() => navigate('/')}>← Menu</button>
        </div>

        <div className="mem-lobby__body">
          <p className="mem-lobby__instructions">
            Flip cards to match each Spanish word with its English translation.
          </p>
          <div className="mem-lobby__diffs">
            {DIFFICULTIES.map(d => (
              <button key={d.id} className="mem-diff-btn" onClick={() => onStart(d)}>
                <span className="mem-diff-btn__icon">{d.icon}</span>
                <div className="mem-diff-btn__body">
                  <span className="mem-diff-btn__label">{d.label}</span>
                  <span className="mem-diff-btn__age">{d.ageRange}</span>
                  <span className="mem-diff-btn__desc">{d.desc}</span>
                </div>
                <span className="mem-diff-btn__go">▶</span>
              </button>
            ))}
          </div>
          {progress.totalPlays > 0 && (
            <p className="mem-lobby__best">Best: {progress.highScore} pts · {progress.totalPlays} games</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MemoryMercado() {
  const [diff, setDiff]           = useState(null);
  const [cards, setCards]         = useState([]);
  const [flipped, setFlipped]     = useState([]);   // up to 2 card ids
  const [matched, setMatched]     = useState(new Set());
  const [tries, setTries]         = useState(0);
  const [phase, setPhase]         = useState('lobby');
  const [locked, setLocked]       = useState(false);
  const [celebrating, setCelebrating] = useState(null); // pairId or null
  const flipTimeout = useRef(null);

  const limit = diff ? TIMER_LIMITS[diff.id] : null;
  const { elapsed, timeLeft } = useTimer(phase === 'playing', limit);

  const startGame = useCallback((d) => {
    clearTimeout(flipTimeout.current);
    setDiff(d);
    setCards(buildCards(d.pairs));
    setFlipped([]);
    setMatched(new Set());
    setTries(0);
    setLocked(false);
    setCelebrating(null);
    setPhase('playing');
  }, []);

  // Timer expiry
  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) {
      setPhase('lost');
      AudioManager.gameOver();
      ProgressSystem.saveGame('memory-mercado', { score: matched.size * 20 });
    }
  }, [timeLeft, phase, matched.size]);

  function flipCard(id) {
    if (locked || phase !== 'playing') return;
    if (flipped.includes(id) || matched.has(cards.find(c => c.id === id)?.pairId)) return;

    const nextFlipped = [...flipped, id];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setTries(t => t + 1);
      setLocked(true);
      const [a, b] = nextFlipped.map(fid => cards.find(c => c.id === fid));

      if (a.pairId === b.pairId) {
        // Match!
        AudioManager.eat(Math.min(matched.size + 1, 6));
        setCelebrating(a.pairId);
        setTimeout(() => setCelebrating(null), 600);
        const newMatched = new Set([...matched, a.pairId]);
        setMatched(newMatched);
        setFlipped([]);
        setLocked(false);

        if (newMatched.size === diff.pairs) {
          const baseScore = diff.pairs * 20;
          const timeBonus = timeLeft ? Math.floor(timeLeft * 1.5) : 0;
          const tryPenalty = Math.max(0, (tries + 1 - diff.pairs) * 3);
          const score = Math.max(0, baseScore + timeBonus - tryPenalty);
          setTimeout(() => {
            setPhase('won');
            AudioManager.levelUp();
            ProgressSystem.saveGame('memory-mercado', { score });
          }, 400);
        }
      } else {
        // No match
        AudioManager.wrong();
        flipTimeout.current = setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, 1100);
      }
    }
  }

  useEffect(() => () => clearTimeout(flipTimeout.current), []);

  if (phase === 'lobby') return <Lobby onStart={startGame} />;

  const won  = phase === 'won';
  const lost = phase === 'lost';
  const score = won
    ? Math.max(0, diff.pairs * 20 + (timeLeft ? Math.floor(timeLeft * 1.5) : 0) - Math.max(0, (tries - diff.pairs) * 3))
    : matched.size * 20;

  return (
    <div className="mem-game">
      {/* Header bar */}
      <div className="mem-hud">
        <button className="mem-hud__back" onClick={() => setPhase('lobby')}>← Menu</button>
        <span className="mem-hud__pairs">{matched.size}/{diff.pairs} pairs</span>
        {timeLeft !== null && (
          <span className={`mem-hud__timer ${timeLeft <= 15 ? 'mem-hud__timer--urgent' : ''}`}>
            ⏱ {timeLeft}s
          </span>
        )}
        {timeLeft === null && (
          <span className="mem-hud__tries">{tries} tries</span>
        )}
      </div>

      {/* Card grid */}
      <div className="mem-grid" style={{ '--cols': diff.cols }}>
        {cards.map(card => {
          const isFlipped  = flipped.includes(card.id) || matched.has(card.pairId);
          const isMatched  = matched.has(card.pairId);
          const isCelebrating = celebrating === card.pairId;

          return (
            <button
              key={card.id}
              className={`mem-card ${isFlipped ? 'mem-card--flipped' : ''} ${isMatched ? 'mem-card--matched' : ''} ${isCelebrating ? 'mem-card--celebrate' : ''}`}
              onClick={() => flipCard(card.id)}
              disabled={isMatched || locked}
            >
              <div className="mem-card__inner">
                <div className="mem-card__back">
                  <span className="mem-card__back-icon">🛒</span>
                </div>
                <div className="mem-card__front">
                  <span className="mem-card__emoji">{card.emoji}</span>
                  <span className={`mem-card__face ${card.type === 'es' ? 'mem-card__face--es' : 'mem-card__face--en'}`}>
                    {card.face}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Win overlay */}
      {won && (
        <div className="mem-overlay">
          <div className="mem-overlay__box">
            <div className="mem-overlay__emoji">🎉</div>
            <h2 className="mem-overlay__title">¡Muy Bien!</h2>
            <div className="mem-overlay__stats">
              <div className="mem-overlay__row"><span>Score</span><strong>{score}</strong></div>
              <div className="mem-overlay__row"><span>Pairs</span><strong>{diff.pairs}/{diff.pairs}</strong></div>
              <div className="mem-overlay__row"><span>Tries</span><strong>{tries}</strong></div>
              {timeLeft !== null && <div className="mem-overlay__row"><span>Time left</span><strong>{timeLeft}s</strong></div>}
            </div>
            <button className="mem-overlay__btn" onClick={() => startGame(diff)}>▶ Play Again</button>
            <button className="mem-overlay__btn mem-overlay__btn--sec" onClick={() => setPhase('lobby')}>Change Level</button>
          </div>
        </div>
      )}

      {/* Lost overlay (timer ran out) */}
      {lost && (
        <div className="mem-overlay">
          <div className="mem-overlay__box">
            <div className="mem-overlay__emoji">⏰</div>
            <h2 className="mem-overlay__title">Time's Up!</h2>
            <div className="mem-overlay__stats">
              <div className="mem-overlay__row"><span>Pairs found</span><strong>{matched.size}/{diff.pairs}</strong></div>
              <div className="mem-overlay__row"><span>Tries</span><strong>{tries}</strong></div>
            </div>
            <button className="mem-overlay__btn" onClick={() => startGame(diff)}>▶ Try Again</button>
            <button className="mem-overlay__btn mem-overlay__btn--sec" onClick={() => setPhase('lobby')}>Change Level</button>
          </div>
        </div>
      )}
    </div>
  );
}
