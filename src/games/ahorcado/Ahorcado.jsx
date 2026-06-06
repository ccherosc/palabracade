import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './Ahorcado.css';

// ─── Word bank ─────────────────────────────────────────────────────────────
const WORDS = [
  { es: 'serpiente', en: 'snake',        cat: 'Animals 🐍' },
  { es: 'mariposa',  en: 'butterfly',    cat: 'Animals 🦋' },
  { es: 'tortuga',   en: 'turtle',       cat: 'Animals 🐢' },
  { es: 'elefante',  en: 'elephant',     cat: 'Animals 🐘' },
  { es: 'conejo',    en: 'rabbit',       cat: 'Animals 🐰' },
  { es: 'manzana',   en: 'apple',        cat: 'Food 🍎' },
  { es: 'naranja',   en: 'orange',       cat: 'Food 🍊' },
  { es: 'zanahoria', en: 'carrot',       cat: 'Food 🥕' },
  { es: 'frijoles',  en: 'beans',        cat: 'Food 🫘' },
  { es: 'platano',   en: 'banana',       cat: 'Food 🍌' },
  { es: 'mochila',   en: 'backpack',     cat: 'School 🎒' },
  { es: 'cuaderno',  en: 'notebook',     cat: 'School 📓' },
  { es: 'maestro',   en: 'teacher',      cat: 'School 👨‍🏫' },
  { es: 'lapiz',     en: 'pencil',       cat: 'School ✏️' },
  { es: 'escuela',   en: 'school',       cat: 'Places 🏫' },
  { es: 'mercado',   en: 'market',       cat: 'Places 🛒' },
  { es: 'ciudad',    en: 'city',         cat: 'Places 🏙️' },
  { es: 'jardin',    en: 'garden',       cat: 'Places 🌳' },
  { es: 'ventana',   en: 'window',       cat: 'Home 🪟' },
  { es: 'cocina',    en: 'kitchen',      cat: 'Home 🍳' },
  { es: 'amarillo',  en: 'yellow',       cat: 'Colors 🟡' },
  { es: 'morado',    en: 'purple',       cat: 'Colors 🟣' },
  { es: 'hablar',    en: 'to speak',     cat: 'Verbs 💬' },
  { es: 'correr',    en: 'to run',       cat: 'Verbs 🏃' },
  { es: 'bailar',    en: 'to dance',     cat: 'Verbs 💃' },
  { es: 'cantar',    en: 'to sing',      cat: 'Verbs 🎵' },
  { es: 'cocinar',   en: 'to cook',      cat: 'Verbs 🍳' },
  { es: 'estudiar',  en: 'to study',     cat: 'Verbs 📚' },
  { es: 'familia',   en: 'family',       cat: 'Family 👨‍👩‍👧' },
  { es: 'hermano',   en: 'brother',      cat: 'Family 👦' },
];

const MAX_WRONG = 6;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ'.split('');
const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKLÑ', 'ZXCVBNM'];

// Normalize accents for matching (á→a, é→e, etc.)
function norm(s) {
  return s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Draw hangman on canvas — returns a draw function per wrong count
function drawHangman(canvas, wrong) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth   = 3;
  ctx.lineCap     = 'round';

  // Gallows
  ctx.beginPath();
  ctx.moveTo(W * 0.15, H * 0.92); ctx.lineTo(W * 0.85, H * 0.92); // base
  ctx.moveTo(W * 0.3,  H * 0.92); ctx.lineTo(W * 0.3,  H * 0.05); // pole
  ctx.moveTo(W * 0.3,  H * 0.05); ctx.lineTo(W * 0.65, H * 0.05); // beam
  ctx.moveTo(W * 0.65, H * 0.05); ctx.lineTo(W * 0.65, H * 0.16); // rope
  ctx.stroke();

  const cx = W * 0.65, hy = H * 0.16;
  ctx.strokeStyle = wrong >= 6 ? '#ef4444' : '#e2e8f0';
  ctx.fillStyle   = wrong >= 6 ? 'rgba(239,68,68,0.15)' : 'transparent';

  if (wrong >= 1) { // head
    ctx.beginPath();
    ctx.arc(cx, hy + H * 0.1, H * 0.09, 0, Math.PI * 2);
    ctx.stroke();
    if (wrong >= 6) ctx.fill();
  }
  if (wrong >= 2) { // body
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.19);
    ctx.lineTo(cx, hy + H * 0.45);
    ctx.stroke();
  }
  if (wrong >= 3) { // left arm
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.24);
    ctx.lineTo(cx - W * 0.12, hy + H * 0.36);
    ctx.stroke();
  }
  if (wrong >= 4) { // right arm
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.24);
    ctx.lineTo(cx + W * 0.12, hy + H * 0.36);
    ctx.stroke();
  }
  if (wrong >= 5) { // left leg
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.45);
    ctx.lineTo(cx - W * 0.12, hy + H * 0.62);
    ctx.stroke();
  }
  if (wrong >= 6) { // right leg
    ctx.beginPath();
    ctx.moveTo(cx, hy + H * 0.45);
    ctx.lineTo(cx + W * 0.12, hy + H * 0.62);
    ctx.stroke();
  }
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function Ahorcado() {
  const navigate  = useNavigate();
  const [phase, setPhase]       = useState('idle');
  const [word, setWord]         = useState(null);
  const [guessed, setGuessed]   = useState(new Set());
  const [wrongCount, setWrong]  = useState(0);
  const [score, setScore]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const [roundWon, setRoundWon] = useState(false);
  const canvasRef = useRef(null);
  const queueRef  = useRef([]);

  const progress = ProgressSystem.getGame('ahorcado');
  const normalizedWordLetters = useMemo(
    () => (word ? word.es.toUpperCase().split('').map(norm) : []),
    [word],
  );
  const normalizedGuesses = useMemo(
    () => new Set([...guessed].map(norm)),
    [guessed],
  );

  // Redraw whenever wrongCount changes
  const canvasRefCb = useCallback((node) => {
    canvasRef.current = node;
    if (node) drawHangman(node, wrongCount);
  }, [wrongCount]);

  useEffect(() => {
    if (canvasRef.current) drawHangman(canvasRef.current, wrongCount);
  }, [wrongCount]);

  function nextWord() {
    if (queueRef.current.length === 0) queueRef.current = shuffle([...WORDS]);
    const w = queueRef.current.pop();
    setWord(w);
    setGuessed(new Set());
    setWrong(0);
    setRoundWon(false);
    setPhase('playing');
  }

  function startGame() {
    setScore(0); setStreak(0);
    queueRef.current = shuffle([...WORDS]);
    nextWord();
  }

  function guess(letter) {
    if (phase !== 'playing' || guessed.has(letter)) return;
    const nextGuessed = new Set([...guessed, letter]);
    setGuessed(nextGuessed);

    const nextNormalizedGuesses = new Set([...nextGuessed].map(norm));
    const hit = normalizedWordLetters.includes(norm(letter));

    if (hit) {
      AudioManager.eat(streak + 1);
      const uniqueNorm = [...new Set(normalizedWordLetters.filter(l => /[A-ZÑ]/.test(l)))];
      const allDone = uniqueNorm.every(nl => nextNormalizedGuesses.has(nl));

      if (allDone) {
        const pts = (MAX_WRONG - wrongCount) * 15 + 20;
        const nextScore = score + pts;
        setScore(nextScore);
        setStreak(k => k + 1);
        setRoundWon(true);
        AudioManager.levelUp();
        ProgressSystem.saveGame('ahorcado', { score: nextScore, streak: streak + 1 });
        setPhase('roundWon');
      }
    } else {
      const next = wrongCount + 1;
      setWrong(next);
      AudioManager.wrong();
      if (navigator.vibrate) navigator.vibrate(60);
      if (next >= MAX_WRONG) {
        setStreak(0);
        AudioManager.gameOver();
        ProgressSystem.saveGame('ahorcado', { score, streak: 0 });
        setPhase('roundLost');
      }
    }
  }

  // Keyboard input
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (e) => {
      const l = e.key.toUpperCase();
      if (LETTERS.includes(l)) guess(l);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, guessed, wrongCount, word]);

  // Compute display
  const wordLetters = word ? word.es.toUpperCase().split('') : [];
  const wrongLetters = word
    ? [...guessed].filter(l => !normalizedWordLetters.includes(norm(l)))
    : [];
  const revealedCount = wordLetters.filter(letter => /[A-ZÁÉÍÓÚÜÑ]/i.test(letter) && normalizedGuesses.has(norm(letter))).length;
  const totalLetters = wordLetters.filter(letter => /[A-ZÁÉÍÓÚÜÑ]/i.test(letter)).length;

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
            <p className="ah-overlay__sub">El Ahorcado · Classic Hangman</p>
            <p className="ah-overlay__desc">Guess the Spanish word letter by letter.<br />
              You see the English hint + category.<br />
              6 wrong guesses = game over!</p>
            {progress.totalPlays > 0 && <p className="ah-overlay__best">Best: {progress.highScore} pts</p>}
            <button className="ah-overlay__btn" onClick={startGame}>▶ Start</button>
          </div>
        </div>
      )}

      {(phase === 'playing' || phase === 'roundWon' || phase === 'roundLost') && word && (
        <div className="ah-layout">
          {/* Left: gallows */}
          <div className="ah-gallows">
            <canvas ref={canvasRefCb} width={220} height={260} className="ah-canvas" />
            <div className="ah-wrong-letters">
              {wrongLetters.map(l => <span key={l} className="ah-wrong-letter">{l}</span>)}
            </div>
          </div>

          {/* Right: word + controls */}
          <div className="ah-right">
            <div className="ah-hint">
              <span className="ah-hint__cat">{word.cat}</span>
              <span className="ah-hint__en">"{word.en}"</span>
            </div>

            <div className="ah-word">
              {wordLetters.map((letter, i) => {
                const isAlpha  = /[A-ZÁÉÍÓÚÜÑ]/i.test(letter);
                const revealed = !isAlpha || [...guessed].some(g => norm(g) === norm(letter)) || phase === 'roundLost';
                return (
                  <span key={i} className={`ah-letter ${!isAlpha ? 'ah-letter--space' : ''} ${revealed && isAlpha ? (phase === 'roundLost' && !([...guessed].some(g => norm(g) === norm(letter))) ? 'ah-letter--missed' : 'ah-letter--revealed') : ''}`}>
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

            {/* Keyboard */}
            <div className="ah-keyboard">
              {KEY_ROWS.map(row => (
                <div key={row} className="ah-keyboard__row">
                  {row.split('').map(l => {
                    const used = guessed.has(l);
                    const isWrong = used && wrongLetters.includes(l);
                    const isRight = used && !isWrong;
                    return (
                      <button key={l}
                        className={`ah-key ${isWrong ? 'ah-key--wrong' : ''} ${isRight ? 'ah-key--right' : ''}`}
                        onClick={() => guess(l)}
                        disabled={used || phase !== 'playing'}
                        aria-label={`Guess ${l}`}
                      >{l}</button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Round result */}
            {phase === 'roundWon' && (
              <div className="ah-result ah-result--won">
                <span>¡Correcto! +{(MAX_WRONG - wrongCount) * 15 + 20} pts</span>
                <button className="ah-result__btn" onClick={nextWord}>Next Word →</button>
              </div>
            )}
            {phase === 'roundLost' && (
              <div className="ah-result ah-result--lost">
                <span>The word was: <strong>{word.es}</strong></span>
                <div className="ah-result__actions">
                  <button className="ah-result__btn" onClick={nextWord}>Try Another</button>
                  <button className="ah-result__btn ah-result__btn--sec" onClick={startGame}>Restart</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
