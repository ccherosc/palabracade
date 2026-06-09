import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './Ahorcado.css';

const WORDS = [
  { es: 'serpiente', en: 'snake', cat: 'Animals 🐍' },
  { es: 'mariposa', en: 'butterfly', cat: 'Animals 🦋' },
  { es: 'tortuga', en: 'turtle', cat: 'Animals 🐢' },
  { es: 'elefante', en: 'elephant', cat: 'Animals 🐘' },
  { es: 'conejo', en: 'rabbit', cat: 'Animals 🐰' },
  { es: 'manzana', en: 'apple', cat: 'Food 🍎' },
  { es: 'naranja', en: 'orange', cat: 'Food 🍊' },
  { es: 'zanahoria', en: 'carrot', cat: 'Food 🥕' },
  { es: 'frijoles', en: 'beans', cat: 'Food 🫘' },
  { es: 'platano', en: 'banana', cat: 'Food 🍌' },
  { es: 'mochila', en: 'backpack', cat: 'School 🎒' },
  { es: 'cuaderno', en: 'notebook', cat: 'School 📓' },
  { es: 'maestro', en: 'teacher', cat: 'School 👨‍🏫' },
  { es: 'lapiz', en: 'pencil', cat: 'School ✏️' },
  { es: 'escuela', en: 'school', cat: 'Places 🏫' },
  { es: 'mercado', en: 'market', cat: 'Places 🛒' },
  { es: 'ciudad', en: 'city', cat: 'Places 🏙️' },
  { es: 'jardin', en: 'garden', cat: 'Places 🌳' },
  { es: 'ventana', en: 'window', cat: 'Home 🪟' },
  { es: 'cocina', en: 'kitchen', cat: 'Home 🍳' },
  { es: 'amarillo', en: 'yellow', cat: 'Colors 🟡' },
  { es: 'morado', en: 'purple', cat: 'Colors 🟣' },
  { es: 'hablar', en: 'to speak', cat: 'Verbs 💬' },
  { es: 'correr', en: 'to run', cat: 'Verbs 🏃' },
  { es: 'bailar', en: 'to dance', cat: 'Verbs 💃' },
  { es: 'cantar', en: 'to sing', cat: 'Verbs 🎵' },
  { es: 'cocinar', en: 'to cook', cat: 'Verbs 🍳' },
  { es: 'estudiar', en: 'to study', cat: 'Verbs 📚' },
  { es: 'familia', en: 'family', cat: 'Family 👨‍👩‍👧' },
  { es: 'hermano', en: 'brother', cat: 'Family 👦' },
];

const MAX_WRONG = 6;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ'.split('');
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];
const AUTO_NEXT_MS = 1600;

function norm(s) {
  return s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function drawHangman(canvas, wrong) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(W * 0.15, H * 0.92); ctx.lineTo(W * 0.85, H * 0.92);
  ctx.moveTo(W * 0.3, H * 0.92); ctx.lineTo(W * 0.3, H * 0.05);
  ctx.moveTo(W * 0.3, H * 0.05); ctx.lineTo(W * 0.65, H * 0.05);
  ctx.moveTo(W * 0.65, H * 0.05); ctx.lineTo(W * 0.65, H * 0.16);
  ctx.stroke();

  const cx = W * 0.65;
  const hy = H * 0.16;
  ctx.strokeStyle = wrong >= 6 ? '#ef4444' : '#e2e8f0';
  ctx.fillStyle = wrong >= 6 ? 'rgba(239,68,68,0.15)' : 'transparent';

  if (wrong >= 1) {
    ctx.beginPath();
    ctx.arc(cx, hy + H * 0.1, H * 0.09, 0, Math.PI * 2);
    ctx.stroke();
    if (wrong >= 6) ctx.fill();
  }
  if (wrong >= 2) {
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.19);
    ctx.lineTo(cx, hy + H * 0.45);
    ctx.stroke();
  }
  if (wrong >= 3) {
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.24);
    ctx.lineTo(cx - W * 0.12, hy + H * 0.36);
    ctx.stroke();
  }
  if (wrong >= 4) {
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.24);
    ctx.lineTo(cx + W * 0.12, hy + H * 0.36);
    ctx.stroke();
  }
  if (wrong >= 5) {
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.45);
    ctx.lineTo(cx - W * 0.12, hy + H * 0.62);
    ctx.stroke();
  }
  if (wrong >= 6) {
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.45);
    ctx.lineTo(cx + W * 0.12, hy + H * 0.62);
    ctx.stroke();
  }
}

export default function Ahorcado() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('idle');
  const [word, setWord] = useState(null);
  const [guessed, setGuessed] = useState(new Set());
  const [wrongCount, setWrong] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [heat, setHeat] = useState(0);
  const [categoryStreak, setCategoryStreak] = useState(0);
  const [lastCategory, setLastCategory] = useState(null);
  const [roundSummary, setRoundSummary] = useState(null);
  const [autoAdvanceMs, setAutoAdvanceMs] = useState(0);
  const canvasRef = useRef(null);
  const queueRef = useRef([]);

  const progress = ProgressSystem.getGame('ahorcado');
  const normalizedWordLetters = useMemo(
    () => (word ? word.es.toUpperCase().split('').map(norm) : []),
    [word],
  );
  const normalizedGuesses = useMemo(
    () => new Set([...guessed].map(norm)),
    [guessed],
  );

  const canvasRefCb = useCallback((node) => {
    canvasRef.current = node;
    if (node) drawHangman(node, wrongCount);
  }, [wrongCount]);

  useEffect(() => {
    if (canvasRef.current) drawHangman(canvasRef.current, wrongCount);
  }, [wrongCount]);

  useEffect(() => {
    if (phase !== 'roundWon' || autoAdvanceMs <= 0) return undefined;
    const timeout = window.setTimeout(() => {
      setAutoAdvanceMs((ms) => {
        const next = ms - 100;
        if (next <= 0) {
          nextWord();
          return 0;
        }
        return next;
      });
    }, 100);
    return () => window.clearTimeout(timeout);
  }, [phase, autoAdvanceMs]);

  function nextWord() {
    if (queueRef.current.length === 0) queueRef.current = shuffle([...WORDS]);
    const w = queueRef.current.pop();
    setWord(w);
    setGuessed(new Set());
    setWrong(0);
    setRoundSummary(null);
    setAutoAdvanceMs(0);
    setPhase('playing');
  }

  function startGame() {
    setScore(0);
    setStreak(0);
    setHeat(0);
    setCategoryStreak(0);
    setLastCategory(null);
    setRoundSummary(null);
    setAutoAdvanceMs(0);
    queueRef.current = shuffle([...WORDS]);
    nextWord();
  }

  function finishWin() {
    const nextStreak = streak + 1;
    const sameCategory = lastCategory === word.cat;
    const nextCategoryStreak = sameCategory ? categoryStreak + 1 : 1;
    const nextHeat = Math.min(heat + 1, 5);
    const base = (MAX_WRONG - wrongCount) * 15 + 20;
    const perfectBonus = wrongCount === 0 ? 30 : 0;
    const categoryBonus = nextCategoryStreak >= 2 ? 15 * (nextCategoryStreak - 1) : 0;
    const multiplier = 1 + heat * 0.25;
    const total = Math.round((base + perfectBonus + categoryBonus) * multiplier);
    const nextScore = score + total;

    setScore(nextScore);
    setStreak(nextStreak);
    setHeat(nextHeat);
    setCategoryStreak(nextCategoryStreak);
    setLastCategory(word.cat);
    setRoundSummary({
      total,
      base,
      perfectBonus,
      categoryBonus,
      multiplier,
      perfect: wrongCount === 0,
      nextCategoryStreak,
    });
    setAutoAdvanceMs(AUTO_NEXT_MS);
    AudioManager.levelUp();
    ProgressSystem.saveGame('ahorcado', {
      score: nextScore,
      streak: nextStreak,
      heat: nextHeat,
    });
    setPhase('roundWon');
  }

  function finishLoss() {
    setStreak(0);
    setHeat(0);
    setCategoryStreak(0);
    setLastCategory(null);
    setRoundSummary(null);
    AudioManager.gameOver();
    ProgressSystem.saveGame('ahorcado', { score, streak: 0, heat: 0 });
    setPhase('roundLost');
  }

  function guess(letter) {
    if (phase !== 'playing' || guessed.has(letter)) return;
    const nextGuessed = new Set([...guessed, letter]);
    setGuessed(nextGuessed);

    const nextNormalizedGuesses = new Set([...nextGuessed].map(norm));
    const hit = normalizedWordLetters.includes(norm(letter));

    if (hit) {
      AudioManager.eat(streak + 1);
      const uniqueNorm = [...new Set(normalizedWordLetters.filter((l) => /[A-ZÑ]/.test(l)))];
      const allDone = uniqueNorm.every((nl) => nextNormalizedGuesses.has(nl));
      if (allDone) finishWin();
      return;
    }

    const next = wrongCount + 1;
    setWrong(next);
    AudioManager.wrong();
    if (navigator.vibrate) navigator.vibrate(60);
    if (next >= MAX_WRONG) finishLoss();
  }

  useEffect(() => {
    if (phase !== 'playing') return undefined;
    const onKey = (e) => {
      const l = e.key.toUpperCase();
      if (LETTERS.includes(l)) guess(l);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, guessed, wrongCount, word, heat, streak, categoryStreak, lastCategory]);

  const wordLetters = word ? word.es.toUpperCase().split('') : [];
  const wrongLetters = word
    ? [...guessed].filter((l) => !normalizedWordLetters.includes(norm(l)))
    : [];
  const revealedCount = wordLetters.filter(
    (letter) => /[A-ZÁÉÍÓÚÜÑ]/i.test(letter) && normalizedGuesses.has(norm(letter)),
  ).length;
  const totalLetters = wordLetters.filter((letter) => /[A-ZÁÉÍÓÚÜÑ]/i.test(letter)).length;
  const heatLabel = ['Cold', 'Warm', 'Hot', 'Wild', 'On Fire', 'Untouchable'][heat];

  return (
    <div className="ah-game">
      <div className="ah-header">
        <button className="ah-header__back" onClick={() => navigate('/')}>← Menu</button>
        <span className="ah-header__title">Ahorcado</span>
        <span className="ah-header__score">⭐ {score}</span>
      </div>

      {phase === 'idle' && (
        <div className="ah-overlay">
          <div className="ah-overlay__box">
            <div className="ah-overlay__emoji">🪢</div>
            <h2 className="ah-overlay__title">Ahorcado</h2>
            <p className="ah-overlay__sub">Classic Hangman · now built for streak chasing</p>
            <p className="ah-overlay__desc">
              Chain clean solves, keep your heat alive, and stack same-category wins.
              One miss too many and the whole heater resets.
            </p>
            {progress.totalPlays > 0 && <p className="ah-overlay__best">Best: {progress.highScore} pts</p>}
            <button className="ah-overlay__btn" onClick={startGame}>▶ Start the streak</button>
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'roundWon' || phase === 'roundLost') && word && (
        <div className="ah-layout">
          <div className="ah-gallows">
            <div className="ah-status-card">
              <div className="ah-status-pill ah-status-pill--heat">🔥 {heatLabel}</div>
              <div className="ah-status-grid">
                <div className="ah-stat">
                  <span className="ah-stat__label">Streak</span>
                  <strong>{streak}</strong>
                </div>
                <div className="ah-stat">
                  <span className="ah-stat__label">Heat</span>
                  <strong>x{(1 + heat * 0.25).toFixed(2)}</strong>
                </div>
                <div className="ah-stat">
                  <span className="ah-stat__label">Theme run</span>
                  <strong>x{categoryStreak || 1}</strong>
                </div>
              </div>
            </div>
            <canvas ref={canvasRefCb} width={220} height={260} className="ah-canvas" />
            <div className="ah-wrong-letters">
              {wrongLetters.map((l) => <span key={l} className="ah-wrong-letter">{l}</span>)}
            </div>
          </div>

          <div className="ah-right">
            <div className="ah-hint">
              <span className="ah-hint__cat">{word.cat}</span>
              <span className="ah-hint__en">"{word.en}"</span>
            </div>

            <div className="ah-word">
              {wordLetters.map((letter, i) => {
                const isAlpha = /[A-ZÁÉÍÓÚÜÑ]/i.test(letter);
                const revealed = !isAlpha || normalizedGuesses.has(norm(letter)) || phase === 'roundLost';
                const missed = phase === 'roundLost' && isAlpha && !normalizedGuesses.has(norm(letter));
                return (
                  <span
                    key={`${letter}-${i}`}
                    className={`ah-letter ${!isAlpha ? 'ah-letter--space' : ''} ${revealed && isAlpha ? (missed ? 'ah-letter--missed' : 'ah-letter--revealed') : ''}`}
                  >
                    {!isAlpha ? ' ' : revealed ? letter : '_'}
                  </span>
                );
              })}
            </div>

            <div className="ah-progress">
              <span>{MAX_WRONG - wrongCount} {MAX_WRONG - wrongCount === 1 ? 'chance' : 'chances'} left</span>
              <span>•</span>
              <span>{revealedCount}/{totalLetters} letters found</span>
              {streak > 0 && <><span>•</span><span>streak x{streak}</span></>}
            </div>

            <div className="ah-keyboard">
              {KEY_ROWS.map((row) => (
                <div key={row} className="ah-keyboard__row">
                  {row.split('').map((l) => {
                    const used = guessed.has(l);
                    const isWrong = used && wrongLetters.includes(l);
                    const isRight = used && !isWrong;
                    return (
                      <button
                        key={l}
                        className={`ah-key ${isWrong ? 'ah-key--wrong' : ''} ${isRight ? 'ah-key--right' : ''}`}
                        onClick={() => guess(l)}
                        disabled={used || phase !== 'playing'}
                        aria-label={`Guess ${l}`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {phase === 'roundWon' && roundSummary && (
              <div className="ah-result ah-result--won">
                <span>
                  ¡Correcto! +{roundSummary.total} pts
                  {roundSummary.perfect ? ' · flawless' : ''}
                </span>
                <div className="ah-bonus-strip">
                  <span>Base {roundSummary.base}</span>
                  {roundSummary.perfectBonus > 0 && <span>Perfect +{roundSummary.perfectBonus}</span>}
                  {roundSummary.categoryBonus > 0 && <span>Theme run +{roundSummary.categoryBonus}</span>}
                  <span>Heat x{roundSummary.multiplier.toFixed(2)}</span>
                </div>
                <div className="ah-result__actions">
                  <button className="ah-result__btn" onClick={nextWord}>Keep the heater →</button>
                  <span className="ah-result__countdown">Auto-next in {(autoAdvanceMs / 1000).toFixed(1)}s</span>
                </div>
              </div>
            )}

            {phase === 'roundLost' && (
              <div className="ah-result ah-result--lost">
                <span>The word was: <strong>{word.es}</strong></span>
                <span className="ah-result__sub">Heat reset. Start a new climb.</span>
                <div className="ah-result__actions">
                  <button className="ah-result__btn" onClick={nextWord}>Quick rematch</button>
                  <button className="ah-result__btn ah-result__btn--sec" onClick={startGame}>Fresh run</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
