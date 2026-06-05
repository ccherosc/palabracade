import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AudioManager } from '../../engine/AudioManager.js';
import { ProgressSystem } from '../../engine/ProgressSystem.js';
import { shuffle } from '../../engine/WordBank.js';
import './FlappyVocab.css';

// ─── Vocab ─────────────────────────────────────────────────────────────────
const VOCAB = [
  { en: 'dog', es: 'perro' },   { en: 'cat', es: 'gato' },
  { en: 'bird', es: 'pájaro' }, { en: 'fish', es: 'pez' },
  { en: 'apple', es: 'manzana' }, { en: 'bread', es: 'pan' },
  { en: 'milk', es: 'leche' },  { en: 'house', es: 'casa' },
  { en: 'book', es: 'libro' },  { en: 'sun', es: 'sol' },
  { en: 'water', es: 'agua' },  { en: 'moon', es: 'luna' },
  { en: 'red', es: 'rojo' },    { en: 'blue', es: 'azul' },
  { en: 'green', es: 'verde' }, { en: 'horse', es: 'caballo' },
  { en: 'egg', es: 'huevo' },   { en: 'friend', es: 'amigo' },
  { en: 'chair', es: 'silla' }, { en: 'pencil', es: 'lápiz' },
];

// ─── Game constants ─────────────────────────────────────────────────────────
const GRAVITY     = 0.38;
const FLAP        = -6.8;
const PIPE_W      = 72;
const GAP_H       = 180;
const PIPE_SPEED  = 2.6;
const PIPE_SPAWN  = 260;   // px between pipe spawns

function pickPair(exclude = []) {
  const pool = VOCAB.filter(w => !exclude.includes(w.es));
  const target = pool[Math.floor(Math.random() * pool.length)];
  const decoys = shuffle(VOCAB.filter(w => w.es !== target.es));
  return { target, decoys: decoys.slice(0, 3) };
}

function makePipe(x, canvasH, target, decoy) {
  const gapTop = 80 + Math.random() * (canvasH - GAP_H - 160);
  return {
    x,
    gapTop,
    gapBot: gapTop + GAP_H,
    passed: false,
    topLabel:  Math.random() > 0.5 ? target.es : decoy.es,
    botLabel:  Math.random() > 0.5 ? target.es : decoy.es,
    targetEs:  target.es,
    targetEn:  target.en,
    scored: false,
  };
}

function makePipeFromVocab(x, canvasH, pair) {
  const { target, decoys } = pair;
  const decoy = decoys[0];
  const topIsTarget = Math.random() > 0.5;
  const gapTop = 90 + Math.random() * (canvasH - GAP_H - 180);
  return {
    x, gapTop,
    gapBot: gapTop + GAP_H,
    passed: false, scored: false,
    topLabel:  topIsTarget ? target.es : decoy.es,
    botLabel:  topIsTarget ? decoy.es  : target.es,
    topIsTarget,
    targetEs:  target.es,
    targetEn:  target.en,
  };
}

export default function FlappyVocab() {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const rafRef    = useRef(null);
  const navigate  = useNavigate();

  const [phase, setPhase]   = useState('idle');   // idle|playing|dead
  const [score, setScore]   = useState(0);
  const [hearts, setHearts] = useState(3);
  const [prompt, setPrompt] = useState(null);     // { en, es }
  const [highScore, setHighScore] = useState(() => ProgressSystem.getGame('flappy-vocab').highScore);

  function initState(canvas) {
    const pair = pickPair();
    const firstPipe = makePipeFromVocab(canvas.width + 60, canvas.height, pair);
    return {
      bird: { x: canvas.width * 0.22, y: canvas.height / 2, vy: 0 },
      pipes: [firstPipe],
      nextPipeX: canvas.width + 60 + PIPE_SPAWN,
      score: 0, hearts: 3,
      currentPair: pair,
      flashMsg: null, flashTimer: 0,
    };
  }

  const flap = useCallback(() => {
    if (!stateRef.current) return;
    stateRef.current.bird.vy = FLAP;
    AudioManager.click();
  }, []);

  function startGame() {
    cancelAnimationFrame(rafRef.current);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = initState(canvas);
    stateRef.current = state;
    setScore(0);
    setHearts(3);
    setPrompt({ en: state.currentPair.target.en, es: state.currentPair.target.es });
    setPhase('playing');
    rafRef.current = requestAnimationFrame(loop);
  }

  const loop = useCallback(() => {
    const canvas = canvasRef.current;
    const state  = stateRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    // ── Physics ──
    state.bird.vy += GRAVITY;
    state.bird.y  += state.bird.vy;

    // Ceiling/floor death
    if (state.bird.y < 0 || state.bird.y + 28 > H) {
      die(state);
      return;
    }

    // ── Pipes ──
    const toRemove = [];
    for (const pipe of state.pipes) {
      pipe.x -= PIPE_SPEED;

      // Spawn next pipe
      if (!pipe._spawned && pipe.x < state.nextPipeX - PIPE_SPAWN) {
        pipe._spawned = true;
        const newPair = pickPair([state.currentPair.target.es]);
        const newPipe = makePipeFromVocab(state.nextPipeX, H, newPair);
        state.pipes.push(newPipe);
        state.nextPipeX += PIPE_SPAWN;
      }

      // Collision check (bird is 24×24 circle approx)
      const bx = state.bird.x, by = state.bird.y;
      const br = 12; // bird radius
      const px1 = pipe.x, px2 = pipe.x + PIPE_W;

      if (bx + br > px1 && bx - br < px2) {
        // In pipe zone — check gap
        if (by - br < pipe.gapTop || by + br > pipe.gapBot) {
          // HIT a pipe wall — check which label the bird is near
          const midY = (pipe.gapTop + pipe.gapBot) / 2;
          const inTopPipe = by < pipe.gapTop;
          const hitLabel  = inTopPipe ? pipe.topLabel : pipe.botLabel;
          const isCorrect = hitLabel === pipe.targetEs;

          if (isCorrect && !pipe.scored) {
            // Flew into correct pipe wall means wrong gap — wrong
            wrongHit(state, pipe);
            return;
          } else if (!isCorrect) {
            wrongHit(state, pipe);
            return;
          } else {
            die(state); return;
          }
        }
      }

      // Passed through gap
      if (!pipe.scored && pipe.x + PIPE_W < bx - br) {
        pipe.scored = true;
        // Did bird pass through correct gap?
        const midBird = state.bird.y;
        const inGap   = midBird > pipe.gapTop && midBird < pipe.gapBot;
        if (inGap) {
          // correct pass
          state.score++;
          AudioManager.eat(state.score);
          const newPair = pickPair([state.currentPair.target.es]);
          state.currentPair = newPair;
          setScore(state.score);
          setPrompt({ en: newPair.target.en, es: newPair.target.es });
          // Update upcoming pipe labels
          const upcomingPipe = state.pipes.find(p => !p.scored);
          if (upcomingPipe) {
            const topIsTarget = Math.random() > 0.5;
            const decoy = newPair.decoys[0];
            upcomingPipe.topLabel    = topIsTarget ? newPair.target.es : decoy.es;
            upcomingPipe.botLabel    = topIsTarget ? decoy.es : newPair.target.es;
            upcomingPipe.topIsTarget = topIsTarget;
            upcomingPipe.targetEs    = newPair.target.es;
            upcomingPipe.targetEn    = newPair.target.en;
          }
        }
      }

      if (pipe.x + PIPE_W < 0) toRemove.push(pipe);
    }
    state.pipes = state.pipes.filter(p => !toRemove.includes(p));

    // Flash timer
    if (state.flashTimer > 0) state.flashTimer--;
    else state.flashMsg = null;

    // ── Draw ──
    drawFrame(ctx, W, H, state, dpr);
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  function wrongHit(state, pipe) {
    state.hearts--;
    AudioManager.wrong();
    if (navigator.vibrate) navigator.vibrate(80);
    state.flashMsg   = `✗  "${pipe.targetEn}" = ${pipe.targetEs}`;
    state.flashTimer = 55;
    setHearts(state.hearts);
    if (state.hearts <= 0) { die(state); }
  }

  function die(state) {
    cancelAnimationFrame(rafRef.current);
    AudioManager.gameOver();
    const s = state.score;
    setHighScore(h => Math.max(h, s));
    ProgressSystem.saveGame('flappy-vocab', { score: s });
    setPhase('dead');
  }

  function drawFrame(ctx, W, H, state, dpr) {
    ctx.clearRect(0, 0, W, H);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a0a2e');
    sky.addColorStop(1, '#0d1b3e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Stars (static pattern)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137.5) % W);
      const sy = ((i * 97.3) % (H * 0.7));
      ctx.beginPath();
      ctx.arc(sx, sy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pipes
    for (const pipe of state.pipes) {
      drawPipe(ctx, pipe, W, H);
    }

    // Bird (parrot emoji style — draw as colored circle with beak)
    const { x, y } = state.bird;
    const tilt = Math.max(-0.5, Math.min(0.8, state.bird.vy * 0.06));

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    // Body
    ctx.fillStyle = '#22c55e';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eye
    ctx.fillStyle = '#0a2e14';
    ctx.beginPath();
    ctx.arc(5, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(6, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(11, -1);
    ctx.lineTo(18, 2);
    ctx.lineTo(11, 5);
    ctx.closePath();
    ctx.fill();

    // Wing
    ctx.fillStyle = 'rgba(16,185,129,0.8)';
    ctx.beginPath();
    ctx.ellipse(-2, 4, 8, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Flash message
    if (state.flashMsg) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.flashTimer / 20);
      ctx.fillStyle   = 'rgba(239,68,68,0.92)';
      ctx.font        = `bold ${14}px system-ui`;
      ctx.textAlign   = 'center';
      const tw = ctx.measureText(state.flashMsg).width;
      const fx = W / 2, fy = H * 0.18;
      ctx.beginPath();
      ctx.roundRect(fx - tw/2 - 10, fy - 16, tw + 20, 26, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(state.flashMsg, fx, fy + 2);
      ctx.restore();
    }

    // Hearts
    const heartSize = 16;
    for (let i = 0; i < 3; i++) {
      ctx.font      = `${heartSize}px system-ui`;
      ctx.textAlign = 'left';
      ctx.globalAlpha = i < state.hearts ? 1 : 0.2;
      ctx.fillText('❤️', 12 + i * (heartSize + 4), 26);
    }
    ctx.globalAlpha = 1;
  }

  function drawPipe(ctx, pipe, W, H) {
    const x = pipe.x, pw = PIPE_W;
    const col  = '#1a5c2a';
    const edge = '#22c55e';
    const cap  = 10;

    // Top pipe body
    ctx.fillStyle = col;
    ctx.fillRect(x, 0, pw, pipe.gapTop - cap);
    // Top pipe cap
    ctx.fillStyle = edge;
    ctx.fillRect(x - 4, pipe.gapTop - cap - cap, pw + 8, cap + cap);

    // Bottom pipe body
    ctx.fillStyle = col;
    ctx.fillRect(x, pipe.gapBot + cap, pw, H - pipe.gapBot - cap);
    // Bottom pipe cap
    ctx.fillStyle = edge;
    ctx.fillRect(x - 4, pipe.gapBot - cap + cap, pw + 8, cap + cap);

    // Labels on caps
    const topCorrect = pipe.topIsTarget;
    const botCorrect = !pipe.topIsTarget;
    const labelY_top = pipe.gapTop - cap - 4;
    const labelY_bot = pipe.gapBot + cap + cap + 14;

    drawPipeLabel(ctx, pipe.topLabel, x + pw / 2, labelY_top - 8, topCorrect);
    drawPipeLabel(ctx, pipe.botLabel, x + pw / 2, labelY_bot + 8, botCorrect);
  }

  function drawPipeLabel(ctx, text, cx, cy, isTarget) {
    const pad = 6;
    ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(text).width;
    const bw = tw + pad * 2, bh = 20;

    ctx.fillStyle = isTarget ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.18)';
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 5);
    ctx.fill();

    ctx.strokeStyle = isTarget ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isTarget ? '#86efac' : '#fca5a5';
    ctx.fillText(text, cx, cy + 5);
  }

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width  = Math.round(rect.width  * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width  = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  // Keyboard + touch flap
  useEffect(() => {
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flap]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="fv-game">
      <div className="fv-canvas-wrap" onClick={phase === 'playing' ? flap : undefined}>
        <canvas ref={canvasRef} className="fv-canvas" />

        {/* Prompt strip */}
        {phase === 'playing' && prompt && (
          <div className="fv-prompt">
            <span className="fv-prompt__label">Fly through:</span>
            <span className="fv-prompt__word">{prompt.en}</span>
            <span className="fv-prompt__arrow">→</span>
            <span className="fv-prompt__hint">find the Spanish!</span>
          </div>
        )}
      </div>

      {/* Idle overlay */}
      {phase === 'idle' && (
        <div className="fv-overlay">
          <div className="fv-overlay__box">
            <div className="fv-overlay__emoji">🦜</div>
            <h2 className="fv-overlay__title">Flappy Vocab</h2>
            <p className="fv-overlay__sub">Vocabulario Volador</p>
            <div className="fv-overlay__wip">⚡ Work in Progress</div>
            <div className="fv-overlay__instructions">
              <p>An English word appears below.</p>
              <p>Fly through the <span className="fv-highlight">green</span> pipe with its Spanish translation.</p>
              <p>Tap / Space to flap · 3 hearts</p>
            </div>
            <button className="fv-overlay__btn" onClick={startGame}>▶ Start Flying</button>
            {highScore > 0 && <p className="fv-overlay__best">Best: {highScore} pipes</p>}
          </div>
        </div>
      )}

      {/* Dead overlay */}
      {phase === 'dead' && (
        <div className="fv-overlay">
          <div className="fv-overlay__box">
            <div className="fv-overlay__emoji">💥</div>
            <h2 className="fv-overlay__title">Crashed!</h2>
            <div className="fv-overlay__stats">
              <div className="fv-overlay__row"><span>Score</span><strong>{score} pipes</strong></div>
              {score >= highScore && score > 0 && <p className="fv-overlay__new">🏆 New Best!</p>}
            </div>
            <button className="fv-overlay__btn" onClick={startGame}>▶ Try Again</button>
            <button className="fv-overlay__btn fv-overlay__btn--sec" onClick={() => navigate('/')}>← Menu</button>
          </div>
        </div>
      )}
    </div>
  );
}
